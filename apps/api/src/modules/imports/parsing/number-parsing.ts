import { Prisma } from '@prisma/client';

/**
 * Conversion des quantités et prix issus d'un fichier bureautique.
 *
 * Les écritures rencontrées en pratique mélangent les conventions : `192.024`
 * (export brut), `1 234,56` (saisie française, avec espace insécable), `1,2`.
 * On tranche en regardant quel séparateur apparaît en dernier : c'est lui qui
 * sépare la partie décimale.
 */

export interface NumberParseResult {
  value: Prisma.Decimal | null;
  /** Motif de l'échec, destiné au rapport d'erreurs ligne à ligne. */
  error: 'EMPTY' | 'NOT_A_NUMBER' | 'NEGATIVE' | null;
  /** La valeur a-t-elle été arrondie à l'échelle de la colonne ? */
  rounded: boolean;
}

export interface NumberParseOptions {
  /**
   * Échelle de la colonne cible. Les valeurs plus précises sont **arrondies**,
   * jamais rejetées : un export de tableur produit couramment des artefacts de
   * flottant (`5689.2846499999996` pour 5 689,2846), qui ne traduisent aucune
   * erreur de l'utilisateur. C'est exactement ce que ferait la colonne
   * `numeric(16,4)` à l'écriture.
   */
  maxDecimals: number;
  /** Une valeur absente est-elle acceptable ? */
  allowEmpty: boolean;
  /** Valeur retenue lorsque la cellule est vide et que c'est autorisé. */
  emptyValue?: Prisma.Decimal;
}

export function parseDecimal(raw: unknown, options: NumberParseOptions): NumberParseResult {
  if (raw === null || raw === undefined) {
    return emptyResult(options);
  }

  // Une cellule Excel numérique arrive déjà typée : aucune interprétation à faire.
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { value: null, error: 'NOT_A_NUMBER', rounded: false };
    return finalize(new Prisma.Decimal(raw), options);
  }

  // Seules les chaînes restent à interpréter : tout autre type traduirait une
  // cellule d'une forme inattendue, qu'on refuse plutôt que de la convertir.
  if (typeof raw !== 'string') return { value: null, error: 'NOT_A_NUMBER', rounded: false };

  const text = raw.trim();

  if (text === '') {
    return emptyResult(options);
  }

  const normalized = normalizeNumericText(text);
  if (normalized === null) return { value: null, error: 'NOT_A_NUMBER', rounded: false };

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    return { value: null, error: 'NOT_A_NUMBER', rounded: false };
  }

  if (!decimal.isFinite()) return { value: null, error: 'NOT_A_NUMBER', rounded: false };

  return finalize(decimal, options);
}

function emptyResult(options: NumberParseOptions): NumberParseResult {
  return options.allowEmpty
    ? { value: options.emptyValue ?? new Prisma.Decimal(0), error: null, rounded: false }
    : { value: null, error: 'EMPTY', rounded: false };
}

function finalize(decimal: Prisma.Decimal, options: NumberParseOptions): NumberParseResult {
  // Le signe est contrôlé avant l'arrondi : -0,0001 doit être refusé, pas
  // transformé en 0 par un arrondi complaisant.
  if (decimal.isNegative()) return { value: null, error: 'NEGATIVE', rounded: false };

  const needsRounding = decimal.decimalPlaces() > options.maxDecimals;
  const value = needsRounding
    ? decimal.toDecimalPlaces(options.maxDecimals, Prisma.Decimal.ROUND_HALF_UP)
    : decimal;

  return { value, error: null, rounded: needsRounding };
}

/**
 * Ramène une écriture humaine à la notation décimale anglo-saxonne.
 * Renvoie `null` si le texte ne ressemble pas à un nombre.
 */
export function normalizeNumericText(text: string): string | null {
  // Espaces ordinaires, insécables (U+00A0) et fines (U+202F), couramment
  // employés comme séparateurs de milliers, ainsi que l'apostrophe suisse.
  // Les échappements évitent des caractères invisibles dans le code source.
  const compact = text.replace(/[\s\u00a0\u202f']/g, '');

  if (!/^[+-]?[\d.,]+$/.test(compact)) return null;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');

  if (lastComma === -1 && lastDot === -1) return compact;

  if (lastComma > lastDot) {
    // La virgule est le séparateur décimal : « 1.234,56 ».
    return compact.replace(/\./g, '').replace(',', '.');
  }

  // Le point est le séparateur décimal : « 1,234.56 » ou « 192.024 ».
  //
  // Cas ambigu assumé : « 1.234 » seul est lu comme 1,234 et non comme 1234.
  // Le fichier de référence contient de véritables décimales à trois chiffres
  // (CONVO-0689 = 192.024) ; les lire comme des milliers fausserait l'inventaire
  // bien plus gravement que l'inverse.
  return compact.replace(/,/g, '');
}
