/**
 * Identifiants techniques partagés entre le seed, les services métier et les
 * tests. Les libellés, eux, vivent en base et restent modifiables par un admin.
 */

/** Codes des méthodes de calcul résolus par InventoryCalculationService. */
export const INVENTORY_METHOD = {
  /** Méthode 1 — somme cumulative de tous les comptages valides. */
  SUM: 'METHOD_1',
  /** Méthode 2 — double comptage contradictoire avec arbitrage. */
  DOUBLE_BLIND: 'METHOD_2',
  /** Méthode 3 — comptages successifs contrôlés sur le théorique, puis enquête. */
  PROGRESSIVE: 'METHOD_3',
} as const;

export type InventoryMethodCode = (typeof INVENTORY_METHOD)[keyof typeof INVENTORY_METHOD];

/** Types de campagne livrés d'origine. La table reste extensible par l'admin. */
export const CAMPAIGN_TYPE = {
  RAW_MATERIAL: 'RAW_MATERIAL',
  SPARE_PARTS: 'SPARE_PARTS',
  FINISHED_GOODS: 'FINISHED_GOODS',
} as const;

export type CampaignTypeCode = (typeof CAMPAIGN_TYPE)[keyof typeof CAMPAIGN_TYPE];

/**
 * Emplacement virtuel rattachant les lignes dont le fichier source ne précise
 * aucun emplacement (29 % des lignes du fichier de référence). Il garantit que
 * `inventory_items.location_id` n'est jamais NULL et que la contrainte d'unicité
 * (liste, article, emplacement) reste pleinement effective.
 */
export const UNLOCATED_LOCATION_CODE = 'NON-LOCALISE';
export const UNLOCATED_LOCATION_LABEL = 'Articles sans emplacement renseigné';

/** Unité par défaut lorsque le fichier source ne la renseigne pas. */
export const DEFAULT_UNIT = 'Unité';

/**
 * Avertissement imposé avant toute clôture de campagne. Il est renvoyé par
 * l'API afin que le web et le mobile affichent exactement le même texte, et
 * que celui-ci ne puisse pas diverger d'un client à l'autre.
 */
export const CLOSURE_WARNING =
  'Les articles non trouvés seront mis à quantité 0. Voulez-vous continuer ?';

/** Taille des lots pour les écritures de masse (clôture, import). */
export const BULK_CHUNK_SIZE = 500;

/**
 * Nombre maximal de comptages automatiques en Méthode 3. Au-delà, la ligne
 * n'est plus départagée par un nouveau comptage mais par l'enquête du
 * superviseur — le « quatrième comptage » du cahier des charges.
 */
export const PROGRESSIVE_MAX_COUNTS = 3;

/**
 * Message opposé à un opérateur qui scanne une seconde fois une ligne qu'il a
 * déjà comptée. Centralisé ici pour que l'API, le web et le mobile disent
 * exactement la même chose.
 */
export const DUPLICATE_COUNT_MESSAGE =
  'Vous avez déjà compté cet article. Pour corriger votre saisie, demandez à votre superviseur d’annuler le comptage précédent.';
