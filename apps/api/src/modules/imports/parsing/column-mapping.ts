/**
 * Reconnaissance des colonnes du fichier d'inventaire.
 *
 * Les en-têtes du fichier client (`Stocks_14-06-2026.xlsx`) sont des libellés
 * générés par l'ERP, avec parenthèses et accents :
 *   Article | (Article (Désignation)) | Magasin | (Magasin (Désignation)) |
 *   Emplacement | Quantite | (Unité (Désignation)) | Pmp |
 *   (Marque article (Désignation)) | (Ref. fabricant)
 *
 * On accepte aussi des en-têtes plus simples (`code_article`, `designation`…)
 * afin que le template officiel reste lisible et qu'un fichier retouché à la
 * main continue d'être accepté.
 */

export const IMPORT_COLUMN = {
  ARTICLE_CODE: 'articleCode',
  DESIGNATION: 'designation',
  WAREHOUSE_CODE: 'warehouseCode',
  WAREHOUSE_LABEL: 'warehouseLabel',
  LOCATION: 'location',
  QUANTITY: 'quantity',
  UNIT: 'unit',
  UNIT_PRICE: 'unitPrice',
  BRAND: 'brand',
  MANUFACTURER_REF: 'manufacturerRef',
} as const;

export type ImportColumn = (typeof IMPORT_COLUMN)[keyof typeof IMPORT_COLUMN];

/** Colonnes sans lesquelles le fichier ne peut pas être exploité. */
export const REQUIRED_COLUMNS: ImportColumn[] = [
  IMPORT_COLUMN.ARTICLE_CODE,
  IMPORT_COLUMN.DESIGNATION,
  IMPORT_COLUMN.WAREHOUSE_CODE,
  IMPORT_COLUMN.QUANTITY,
];

/** Libellés attendus dans le template officiel, dans l'ordre. */
export const TEMPLATE_HEADERS: { column: ImportColumn; header: string; required: boolean }[] = [
  { column: IMPORT_COLUMN.ARTICLE_CODE, header: 'Article', required: true },
  { column: IMPORT_COLUMN.DESIGNATION, header: '(Article (Désignation))', required: true },
  { column: IMPORT_COLUMN.WAREHOUSE_CODE, header: 'Magasin', required: true },
  { column: IMPORT_COLUMN.WAREHOUSE_LABEL, header: '(Magasin (Désignation))', required: false },
  { column: IMPORT_COLUMN.LOCATION, header: 'Emplacement', required: false },
  { column: IMPORT_COLUMN.QUANTITY, header: 'Quantite', required: true },
  { column: IMPORT_COLUMN.UNIT, header: '(Unité (Désignation))', required: false },
  { column: IMPORT_COLUMN.UNIT_PRICE, header: 'Pmp', required: false },
  { column: IMPORT_COLUMN.BRAND, header: '(Marque article (Désignation))', required: false },
  { column: IMPORT_COLUMN.MANUFACTURER_REF, header: '(Ref. fabricant)', required: false },
];

/**
 * Réduit un en-tête à sa forme comparable : minuscules, sans accents, sans
 * ponctuation ni espaces. `(Article (Désignation))` devient
 * `articledesignation`, qui reste distinct de `article`.
 */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Table des en-têtes reconnus, par forme normalisée. */
const HEADER_ALIASES: Record<string, ImportColumn> = {};

const registerAliases = (column: ImportColumn, aliases: string[]): void => {
  for (const alias of aliases) {
    HEADER_ALIASES[normalizeHeader(alias)] = column;
  }
};

registerAliases(IMPORT_COLUMN.ARTICLE_CODE, [
  'Article',
  'code_article',
  'Code article',
  'Code',
  'Reference',
  'Référence',
]);
registerAliases(IMPORT_COLUMN.DESIGNATION, [
  '(Article (Désignation))',
  'Article (Désignation)',
  'Designation',
  'Désignation',
  'Libelle',
  'Libellé',
]);
registerAliases(IMPORT_COLUMN.WAREHOUSE_CODE, ['Magasin', 'code_magasin', 'Code magasin', 'Depot']);
registerAliases(IMPORT_COLUMN.WAREHOUSE_LABEL, [
  '(Magasin (Désignation))',
  'Magasin (Désignation)',
  'Libelle magasin',
]);
registerAliases(IMPORT_COLUMN.LOCATION, ['Emplacement', 'emplacement', 'Localisation', 'Zone']);
registerAliases(IMPORT_COLUMN.QUANTITY, [
  'Quantite',
  'Quantité',
  'quantite_theorique',
  'Quantité théorique',
  'Qte',
  'Stock',
]);
registerAliases(IMPORT_COLUMN.UNIT, ['(Unité (Désignation))', 'Unité', 'Unite', 'UOM']);
registerAliases(IMPORT_COLUMN.UNIT_PRICE, [
  'Pmp',
  'PMP',
  'prix_moyen_pondere',
  'Prix moyen pondéré',
  'Prix unitaire',
]);
registerAliases(IMPORT_COLUMN.BRAND, [
  '(Marque article (Désignation))',
  'Marque article (Désignation)',
  'Marque',
]);
registerAliases(IMPORT_COLUMN.MANUFACTURER_REF, [
  '(Ref. fabricant)',
  'Ref. fabricant',
  'Référence fabricant',
  'ref_fabricant',
]);

/** Colonne correspondant à un en-tête, ou `null` si non reconnue. */
export function resolveColumn(header: string): ImportColumn | null {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}

/**
 * Associe chaque colonne reconnue à son index dans la ligne d'en-tête.
 * Les colonnes inconnues sont simplement ignorées : un export ERP comporte
 * souvent des colonnes dont l'inventaire n'a que faire.
 */
export function mapHeaderRow(headers: (string | null)[]): {
  mapping: Partial<Record<ImportColumn, number>>;
  unknownHeaders: string[];
} {
  const mapping: Partial<Record<ImportColumn, number>> = {};
  const unknownHeaders: string[] = [];

  headers.forEach((header, index) => {
    if (header === null || header.trim() === '') return;

    const column = resolveColumn(header);
    if (column === null) {
      unknownHeaders.push(header.trim());
      return;
    }

    // En cas de doublon, la première occurrence fait foi.
    if (mapping[column] === undefined) mapping[column] = index;
  });

  return { mapping, unknownHeaders };
}

/** Une ligne d'en-tête est valable si elle porte les colonnes indispensables. */
export function isUsableHeaderRow(mapping: Partial<Record<ImportColumn, number>>): boolean {
  return REQUIRED_COLUMNS.every((column) => mapping[column] !== undefined);
}
