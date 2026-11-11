import { type CountStatus, type ItemStatus, type Prisma } from '@prisma/client';

/** Comptage tel que le voit le moteur de calcul. */
export interface CountSnapshot {
  id: string;
  userId: string;
  quantity: Prisma.Decimal;
  countedAt: Date;
  status: CountStatus;
}

/** État d'une ligne soumis au calcul. */
export interface ItemCalculationInput {
  theoreticalQty: Prisma.Decimal;
  /** Pmp figé à l'import, utilisé pour valoriser l'écart. */
  unitPrice: Prisma.Decimal;
  counts: CountSnapshot[];
  /** Valeur tranchée par le superviseur. Prime sur tout le reste. */
  arbitratedQty: Prisma.Decimal | null;
  /** L'opérateur a explicitement déclaré l'article introuvable. */
  markedNotFound: boolean;
}

export interface ItemCalculationResult {
  status: ItemStatus;
  /** Quantité retenue. `null` tant que la ligne n'est pas résolue. */
  finalQty: Prisma.Decimal | null;
  /** `finalQty − theoreticalQty`. Positif = surplus, négatif = manque. */
  variance: Prisma.Decimal | null;
  /** Valeur absolue de l'écart. */
  absoluteDifference: Prisma.Decimal | null;
  /** `variance × unitPrice`. */
  varianceValue: Prisma.Decimal | null;
  /** `variance / theoreticalQty`. `null` si la quantité théorique est nulle. */
  varianceRate: number | null;
  /**
   * La ligne empêche la clôture de la campagne : second comptage attendu, ou
   * litige non tranché.
   */
  blocksClosure: boolean;
  /** Nombre d'utilisateurs distincts ayant compté la ligne. */
  distinctCounterCount: number;
  /** Nombre de comptages valides. */
  validCountCount: number;
  /**
   * Rang du prochain comptage attendu (1 = premier comptage, 2 = second…), ou
   * `null` si la ligne est résolue ou si la méthode n'enchaîne pas les
   * comptages. Le mobile s'en sert pour annoncer « 2ᵉ comptage » à l'opérateur
   * plutôt que de le laisser deviner pourquoi la ligne revient.
   */
  expectedCountNumber: number | null;
  /**
   * La ligne ne peut plus être départagée par un comptage supplémentaire :
   * seule l'enquête du superviseur la résout.
   */
  requiresInvestigation: boolean;
}

/** Contexte transmis à une stratégie en plus des comptages. */
export interface StrategyContext {
  theoreticalQty: Prisma.Decimal;
}

export interface StrategyResolution {
  status: ItemStatus;
  finalQty: Prisma.Decimal | null;
  /** Voir `ItemCalculationResult.expectedCountNumber`. */
  expectedCountNumber?: number | null;
}

/**
 * Stratégie de résolution d'une ligne. Ajouter une méthode d'inventaire consiste
 * à écrire une classe implémentant cette interface et à l'enregistrer dans
 * InventoryCalculationService — plus une ligne dans la table `inventory_methods`.
 * Aucune migration de schéma n'est nécessaire.
 */
export interface InventoryMethodStrategy {
  readonly code: string;
  /**
   * Un même opérateur peut-il compter plusieurs fois la même ligne ?
   *
   * Vrai uniquement pour la somme cumulative, où chaque saisie représente une
   * portion distincte du périmètre. Partout ailleurs un second scan est une
   * erreur de manipulation : la quantité s'ajouterait silencieusement à la
   * précédente et fausserait l'inventaire. `CountsService` refuse alors la
   * saisie — voir `DUPLICATE_COUNT_MESSAGE`.
   */
  readonly allowsRepeatCountByUser: boolean;
  /**
   * Détermine le statut et la quantité retenue à partir des comptages et de la
   * quantité théorique. L'arbitrage (enquête), la déclaration « non trouvé » et
   * le calcul des écarts sont traités en amont et en aval, de façon identique
   * pour toutes les méthodes.
   */
  resolve(counts: CountSnapshot[], context: StrategyContext): StrategyResolution;
}
