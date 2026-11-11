import { ItemStatus, Prisma } from '@prisma/client';

import {
  INVENTORY_METHOD,
  PROGRESSIVE_MAX_COUNTS,
} from '../constants/inventory.constants';

import { orderedValidCounts } from './count-ordering';
import type {
  CountSnapshot,
  InventoryMethodStrategy,
  StrategyContext,
  StrategyResolution,
} from './inventory-calculation.types';

/**
 * Méthode 1 — Somme cumulative.
 *
 * Chaque comptage est une saisie partielle : une zone, un opérateur, un passage.
 * Les comptages s'additionnent au lieu de se remplacer. Adaptée aux périmètres
 * étendus découpés par zone.
 *
 * Contrepartie assumée : un périmètre compté deux fois par erreur produit un
 * doublon arithmétique. Cette méthode suppose un découpage rigoureux des zones ;
 * sinon, utiliser la Méthode 2.
 */
export class SumStrategy implements InventoryMethodStrategy {
  readonly code = INVENTORY_METHOD.SUM;

  /** Seule méthode où recompter est légitime : c'est son principe même. */
  readonly allowsRepeatCountByUser = true;

  resolve(counts: CountSnapshot[]): StrategyResolution {
    if (counts.length === 0) {
      return { status: ItemStatus.PENDING, finalQty: null };
    }

    const total = counts.reduce((sum, count) => sum.plus(count.quantity), new Prisma.Decimal(0));

    return { status: ItemStatus.COUNTED, finalQty: total };
  }
}

/**
 * Méthode 2 — Double comptage contradictoire.
 *
 * Au moins deux comptages indépendants, réalisés par des utilisateurs
 * différents, doivent concorder. Seul le **dernier comptage de chaque
 * utilisateur** est retenu : deux saisies du même opérateur ne valent qu'une
 * voix, sans quoi le caractère contradictoire disparaîtrait.
 */
export class DoubleBlindStrategy implements InventoryMethodStrategy {
  readonly code = INVENTORY_METHOD.DOUBLE_BLIND;

  readonly allowsRepeatCountByUser = false;

  resolve(counts: CountSnapshot[]): StrategyResolution {
    const retained = DoubleBlindStrategy.latestPerUser(counts);

    if (retained.length === 0) {
      return { status: ItemStatus.PENDING, finalQty: null };
    }

    if (retained.length === 1) {
      // Un seul avis : insuffisant pour trancher, et la clôture reste bloquée.
      return { status: ItemStatus.AWAITING_SECOND_COUNT, finalQty: null };
    }

    const first = retained[0] as Prisma.Decimal;
    if (retained.every((quantity) => quantity.equals(first))) {
      return { status: ItemStatus.CONFIRMED, finalQty: first };
    }

    const majority = DoubleBlindStrategy.strictMajority(retained);
    if (majority !== null) {
      return { status: ItemStatus.CONFIRMED, finalQty: majority };
    }

    return { status: ItemStatus.DISCREPANCY, finalQty: null };
  }

  /** Dernier comptage de chaque utilisateur, dans l'ordre des utilisateurs. */
  private static latestPerUser(counts: CountSnapshot[]): Prisma.Decimal[] {
    const latest = new Map<string, CountSnapshot>();

    for (const count of counts) {
      const previous = latest.get(count.userId);
      if (!previous || count.countedAt.getTime() >= previous.countedAt.getTime()) {
        latest.set(count.userId, count);
      }
    }

    return [...latest.values()].map((count) => count.quantity);
  }

  /**
   * Valeur apparaissant **strictement** plus souvent que toutes les autres.
   *
   * Un troisième comptage départage ainsi un désaccord entre deux opérateurs.
   * En l'absence de majorité stricte (trois valeurs différentes, ou égalité),
   * la ligne reste en litige : seul le superviseur peut trancher.
   */
  private static strictMajority(quantities: Prisma.Decimal[]): Prisma.Decimal | null {
    const tally: { value: Prisma.Decimal; occurrences: number }[] = [];

    for (const quantity of quantities) {
      const entry = tally.find((candidate) => candidate.value.equals(quantity));
      if (entry) {
        entry.occurrences += 1;
      } else {
        tally.push({ value: quantity, occurrences: 1 });
      }
    }

    tally.sort((a, b) => b.occurrences - a.occurrences);

    const best = tally[0];
    const runnerUp = tally[1];

    if (!best) return null;
    if (runnerUp && runnerUp.occurrences === best.occurrences) return null;

    return best.value;
  }
}


/**
 * Méthode 3 — Comptages successifs contrôlés sur le théorique, puis enquête.
 *
 * Règle métier arrêtée avec l'exploitant. `T` est la quantité théorique issue
 * de l'extraction SAP, `C1 C2 C3` les comptages **dans l'ordre chronologique** :
 *
 * ```
 * C1 = T                      → OK
 * sinon C2 = T                → OK
 *       C2 = C1               → OK          (deux observations concordantes)
 *       sinon                 → C3
 *           C3 = T            → OK
 *           sinon             → ENQUÊTE     (4ᵉ niveau, superviseur)
 * ```
 *
 * Deux différences assumées avec la Méthode 2 :
 *
 * — Le théorique fait autorité dès qu'un comptage le confirme. Un seul comptage
 *   suffit alors, ce qui évite de recompter inutilement les milliers de lignes
 *   déjà justes : sur le fichier de référence, c'est l'écrasante majorité.
 *
 * — Au 3ᵉ comptage, la concordance entre comptages ne suffit plus. Si C3 diffère
 *   du théorique, c'est que deux hypothèses s'opposent depuis le début ; aucune
 *   quantité n'est retenue automatiquement et la ligne part en enquête. Retenir
 *   une majorité ici reviendrait à trancher à la place de l'exploitant sur
 *   précisément les lignes où il doit regarder.
 *
 * L'enquête est traitée en amont par `InventoryCalculationService` : c'est le
 * champ `arbitratedQty`, assorti d'un motif obligatoire.
 */
export class ProgressiveStrategy implements InventoryMethodStrategy {
  readonly code = INVENTORY_METHOD.PROGRESSIVE;

  /**
   * Un second scan du même opérateur ne vaut pas second comptage : il n'apporte
   * aucune contradiction et, sur l'ancienne somme cumulative, doublait la
   * quantité sans le dire.
   */
  readonly allowsRepeatCountByUser = false;

  resolve(counts: CountSnapshot[], context: StrategyContext): StrategyResolution {
    const quantities = ProgressiveStrategy.chronological(counts);
    const theoretical = context.theoreticalQty;

    if (quantities.length === 0) {
      return { status: ItemStatus.PENDING, finalQty: null, expectedCountNumber: 1 };
    }

    const [first, second, third] = quantities;

    // --- Comptage 1 -------------------------------------------------------
    if (first !== undefined && first.equals(theoretical)) {
      return { status: ItemStatus.CONFIRMED, finalQty: first, expectedCountNumber: null };
    }

    if (quantities.length === 1) {
      return {
        status: ItemStatus.AWAITING_SECOND_COUNT,
        finalQty: null,
        expectedCountNumber: 2,
      };
    }

    // --- Comptage 2 -------------------------------------------------------
    if (second !== undefined && second.equals(theoretical)) {
      return { status: ItemStatus.CONFIRMED, finalQty: second, expectedCountNumber: null };
    }

    if (second !== undefined && first !== undefined && second.equals(first)) {
      // Deux opérateurs indépendants trouvent la même chose : l'écart avec le
      // théorique est réel et la quantité comptée fait foi.
      return { status: ItemStatus.CONFIRMED, finalQty: second, expectedCountNumber: null };
    }

    if (quantities.length === 2) {
      return {
        status: ItemStatus.AWAITING_THIRD_COUNT,
        finalQty: null,
        expectedCountNumber: PROGRESSIVE_MAX_COUNTS,
      };
    }

    // --- Comptage 3 -------------------------------------------------------
    if (third !== undefined && third.equals(theoretical)) {
      return { status: ItemStatus.CONFIRMED, finalQty: third, expectedCountNumber: null };
    }

    // Trois passages, trois réponses qui ne convergent pas sur le théorique :
    // un comptage de plus n'apporterait rien. Seule l'enquête tranche.
    return { status: ItemStatus.UNDER_INVESTIGATION, finalQty: null, expectedCountNumber: null };
  }

  /**
   * Quantités des comptages, du plus ancien au plus récent.
   *
   * L'ordre chronologique **est** la règle : « comptage 1 », « comptage 2 » et
   * « comptage 3 » désignent des passages successifs, pas des opérateurs.
   * L'ordonnancement est partagé avec les rapports — voir `count-ordering.ts` —
   * pour que la colonne « Comptage 2 » d'un export désigne exactement le
   * comptage sur lequel le statut a été décidé.
   */
  private static chronological(counts: CountSnapshot[]): Prisma.Decimal[] {
    return orderedValidCounts(counts).map((count) => count.quantity);
  }
}
