import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CountStatus, ItemStatus, Prisma } from '@prisma/client';

import { DoubleBlindStrategy, ProgressiveStrategy, SumStrategy } from './strategies';
import type {
  CountSnapshot,
  InventoryMethodStrategy,
  ItemCalculationInput,
  ItemCalculationResult,
  StrategyResolution,
} from './inventory-calculation.types';

/**
 * Statuts qui empêchent la clôture : la ligne attend encore un comptage ou une
 * décision humaine. Clôturer dans cet état reviendrait à figer une quantité que
 * personne n'a validée.
 */
const UNRESOLVED_STATUSES: ItemStatus[] = [
  ItemStatus.AWAITING_SECOND_COUNT,
  ItemStatus.AWAITING_THIRD_COUNT,
  ItemStatus.UNDER_INVESTIGATION,
  ItemStatus.DISCREPANCY,
];

/**
 * Point unique de vérité pour tout calcul d'inventaire.
 *
 * Aucune autre classe de l'application ne doit additionner des comptages,
 * déterminer un écart ou décider du statut d'une ligne : la règle doit rester
 * lisible et testable en un seul endroit. Le service ne touche pas à la base et
 * n'a aucune dépendance — il est donc entièrement couvrable par des tests
 * unitaires rapides.
 *
 * Voir `docs/methodes-calcul.md` pour l'énoncé métier des règles.
 */
@Injectable()
export class InventoryCalculationService {
  private readonly strategies: Map<string, InventoryMethodStrategy>;

  constructor() {
    this.strategies = new Map(
      [new SumStrategy(), new DoubleBlindStrategy(), new ProgressiveStrategy()].map((strategy) => [
        strategy.code,
        strategy,
      ]),
    );
  }

  /** Codes des méthodes implémentées. */
  supportedMethods(): string[] {
    return [...this.strategies.keys()];
  }

  /**
   * La méthode tolère-t-elle qu'un même opérateur compte deux fois la même
   * ligne ?
   *
   * Seule la somme cumulative le permet. Ailleurs, un second scan est une
   * fausse manœuvre dont la conséquence — une quantité gonflée sans trace
   * visible — ne se découvre qu'à l'analyse des écarts, bien trop tard.
   * `CountsService` interroge ce drapeau avant d'enregistrer un comptage.
   */
  allowsRepeatCountByUser(methodCode: string): boolean {
    return this.strategy(methodCode).allowsRepeatCountByUser;
  }

  /**
   * Évalue une ligne **en cours de campagne**.
   *
   * Une ligne sans aucun comptage est `PENDING` : elle n'est pas encore
   * traitée, ce qui n'est pas la même chose qu'introuvable. La conversion des
   * lignes non traitées en quantité 0 n'a lieu qu'à la clôture, après
   * confirmation explicite — voir `calculateAtClosure`.
   */
  calculate(methodCode: string, input: ItemCalculationInput): ItemCalculationResult {
    const validCounts = InventoryCalculationService.validCounts(input.counts);
    const distinctCounterCount = new Set(validCounts.map((count) => count.userId)).size;

    const resolution = this.resolveStatus(methodCode, input, validCounts);

    return {
      status: resolution.status,
      finalQty: resolution.finalQty,
      ...InventoryCalculationService.variance(
        resolution.finalQty,
        input.theoreticalQty,
        input.unitPrice,
      ),
      blocksClosure: UNRESOLVED_STATUSES.includes(resolution.status),
      requiresInvestigation: resolution.status === ItemStatus.UNDER_INVESTIGATION,
      expectedCountNumber: resolution.expectedCountNumber ?? null,
      distinctCounterCount,
      validCountCount: validCounts.length,
    };
  }

  /**
   * Évalue une ligne **au moment de la clôture**.
   *
   * Seule différence avec `calculate` : les lignes jamais comptées (`PENDING`)
   * et les lignes déclarées introuvables (`NOT_FOUND`) reçoivent la quantité 0.
   * C'est l'effet de l'avertissement « Les articles non trouvés seront mis à
   * quantité 0 », et il ne se produit nulle part ailleurs.
   */
  calculateAtClosure(methodCode: string, input: ItemCalculationInput): ItemCalculationResult {
    const result = this.calculate(methodCode, input);

    if (result.status !== ItemStatus.PENDING && result.status !== ItemStatus.NOT_FOUND) {
      return result;
    }

    const zero = new Prisma.Decimal(0);

    return {
      ...result,
      status: ItemStatus.NOT_FOUND,
      finalQty: zero,
      expectedCountNumber: null,
      ...InventoryCalculationService.variance(zero, input.theoreticalQty, input.unitPrice),
    };
  }

  /** Une ligne bloque-t-elle la clôture ? */
  blocksClosure(methodCode: string, input: ItemCalculationInput): boolean {
    return this.calculate(methodCode, input).blocksClosure;
  }

  private resolveStatus(
    methodCode: string,
    input: ItemCalculationInput,
    validCounts: CountSnapshot[],
  ): StrategyResolution {
    // L'arbitrage du superviseur — l'« enquête » en Méthode 3 — prime sur toute
    // règle de méthode : c'est précisément sa raison d'être, dénouer une
    // situation que le calcul automatique ne sait pas trancher.
    if (input.arbitratedQty !== null) {
      return {
        status: ItemStatus.CONFIRMED,
        finalQty: input.arbitratedQty,
        expectedCountNumber: null,
      };
    }

    // Un article déclaré introuvable alors qu'il a été compté : le comptage
    // l'emporte, car il constitue une observation positive et datée.
    if (input.markedNotFound && validCounts.length === 0) {
      return { status: ItemStatus.NOT_FOUND, finalQty: null, expectedCountNumber: null };
    }

    return this.strategy(methodCode).resolve(validCounts, {
      theoreticalQty: input.theoreticalQty,
    });
  }

  private strategy(methodCode: string): InventoryMethodStrategy {
    const strategy = this.strategies.get(methodCode);

    if (!strategy) {
      // Une campagne référençant une méthode sans implémentation doit échouer
      // bruyamment : produire un résultat par défaut fausserait un inventaire.
      throw new InternalServerErrorException(
        `Méthode d'inventaire « ${methodCode} » non implémentée. Méthodes disponibles : ${this.supportedMethods().join(', ')}.`,
      );
    }

    return strategy;
  }

  /** Un comptage annulé est exclu de tout calcul. */
  private static validCounts(counts: CountSnapshot[]): CountSnapshot[] {
    return counts.filter((count) => count.status === CountStatus.VALID);
  }

  /**
   * Écarts, communs à toutes les méthodes :
   *   écart      = quantité finale − quantité théorique
   *   différence = |écart|
   *   valeur     = écart × prix unitaire
   *   taux       = écart / quantité théorique   (null si théorique = 0)
   */
  private static variance(
    finalQty: Prisma.Decimal | null,
    theoreticalQty: Prisma.Decimal,
    unitPrice: Prisma.Decimal,
  ): Pick<
    ItemCalculationResult,
    'variance' | 'absoluteDifference' | 'varianceValue' | 'varianceRate'
  > {
    if (finalQty === null) {
      return {
        variance: null,
        absoluteDifference: null,
        varianceValue: null,
        varianceRate: null,
      };
    }

    const variance = finalQty.minus(theoreticalQty);

    return {
      variance,
      absoluteDifference: variance.abs(),
      varianceValue: variance.times(unitPrice),
      // Un taux rapporté à une quantité théorique nulle n'a pas de sens : tout
      // surplus serait une variation infinie.
      varianceRate: theoreticalQty.isZero() ? null : variance.dividedBy(theoreticalQty).toNumber(),
    };
  }
}
