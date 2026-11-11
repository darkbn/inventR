/**
 * Normalisation et décomposition des codes d'emplacement.
 *
 * Le fichier de référence du client mélange plusieurs formes :
 *   - `1-1-C-7`          allée 1, travée 1, niveau C, case 7
 *   - `3-2-C`            allée 3, travée 2, niveau C (sans case)
 *   - `ARMOIR1`          libellé libre
 *   - `ARMOIRE CONSM`    libellé libre, avec variantes orthographiques
 *   - `16-7-A/16-6-B`    double emplacement, conservé tel quel
 *   - vide               29 % des lignes → emplacement virtuel NON-LOCALISE
 */

/** Décomposition d'un code structuré, pour un tri physique correct. */
export interface LocationParts {
  aisle: number | null;
  bay: number | null;
  level: string | null;
  slot: number | null;
}

export const EMPTY_LOCATION_PARTS: LocationParts = {
  aisle: null,
  bay: null,
  level: null,
  slot: null,
};

/**
 * Forme canonique d'un code : majuscules, sans accents, espaces compressés.
 * Sert de clé de recherche et de base à la détection des variantes
 * orthographiques (`ARMOIR CONSM` ↔ `ARMOIRE CONSM`).
 */
export function normalizeLocationCode(raw: string): string {
  return (
    raw
      .normalize('NFD')
      // Retire les diacritiques décomposés par NFD.
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Décompose un code de la forme `allée-travée-niveau[-case]`.
 *
 * Renvoie des valeurs nulles pour tout code qui ne suit pas ce schéma (libellé
 * libre, double emplacement) : ces emplacements seront triés par leur code, après
 * les emplacements structurés.
 */
export function parseLocationCode(raw: string): LocationParts {
  const normalized = normalizeLocationCode(raw);

  // Un double emplacement (`16-7-A/16-6-B`) n'a pas de position unique.
  if (normalized.includes('/')) return { ...EMPTY_LOCATION_PARTS };

  const match = /^(\d{1,3})-(\d{1,3})-([A-Z]{1,2})(?:-(\d{1,4}))?$/.exec(normalized);
  if (!match) return { ...EMPTY_LOCATION_PARTS };

  const [, aisle, bay, level, slot] = match;

  return {
    aisle: Number.parseInt(aisle as string, 10),
    bay: Number.parseInt(bay as string, 10),
    level: level as string,
    slot: slot === undefined ? null : Number.parseInt(slot, 10),
  };
}

/**
 * Distance de Levenshtein, bornée : au-delà de `maxDistance`, la fonction
 * renvoie `maxDistance + 1` sans finir le calcul. Utilisée à l'import pour
 * signaler qu'un emplacement inconnu ressemble à un emplacement existant.
 */
export function levenshteinDistance(a: string, b: string, maxDistance = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  let previous: number[] = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current: number[] = [i];
    let rowMinimum = i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (current[j - 1] as number) + 1, // insertion
        (previous[j] as number) + 1, // suppression
        (previous[j - 1] as number) + substitutionCost, // substitution
      );
      current[j] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }

    // Toute la ligne dépasse le seuil : la distance finale ne peut plus descendre.
    if (rowMinimum > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length] as number;
}

/**
 * Deux codes sont considérés comme des variantes probables du même emplacement
 * s'ils sont proches ET assez longs pour que la ressemblance soit significative :
 * sur des codes courts, `1-1-A` et `1-1-B` seraient à distance 1 tout en
 * désignant deux emplacements bien distincts.
 */
export function isLikelyVariant(a: string, b: string, maxDistance = 2): boolean {
  const left = normalizeLocationCode(a);
  const right = normalizeLocationCode(b);

  if (left === right) return false;
  if (Math.min(left.length, right.length) < 6) return false;

  // Les codes structurés sont des coordonnées exactes : une différence de
  // caractère y est significative, jamais une faute de frappe à corriger.
  if (parseLocationCode(left).aisle !== null || parseLocationCode(right).aisle !== null) {
    return false;
  }

  return levenshteinDistance(left, right, maxDistance) <= maxDistance;
}
