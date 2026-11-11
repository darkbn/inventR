import {
  isLikelyVariant,
  levenshteinDistance,
  normalizeLocationCode,
  parseLocationCode,
} from './location-code';

describe('normalizeLocationCode', () => {
  it('met en majuscules et compresse les espaces', () => {
    expect(normalizeLocationCode('  armoire   consm ')).toBe('ARMOIRE CONSM');
  });

  it('retire les accents', () => {
    expect(normalizeLocationCode('Allée Côté Nord')).toBe('ALLEE COTE NORD');
  });

  it('laisse intacts les codes structurés', () => {
    expect(normalizeLocationCode('1-1-C-7')).toBe('1-1-C-7');
  });
});

describe('parseLocationCode', () => {
  // Formes réellement présentes dans Stocks_14-06-2026.xlsx.
  it('décompose allée-travée-niveau-case', () => {
    expect(parseLocationCode('1-1-C-7')).toEqual({ aisle: 1, bay: 1, level: 'C', slot: 7 });
  });

  it('décompose allée-travée-niveau sans case', () => {
    expect(parseLocationCode('3-2-C')).toEqual({ aisle: 3, bay: 2, level: 'C', slot: null });
  });

  it('gère les allées à deux chiffres', () => {
    expect(parseLocationCode('24-4-B')).toEqual({ aisle: 24, bay: 4, level: 'B', slot: null });
  });

  it('ne décompose pas un libellé libre', () => {
    expect(parseLocationCode('ARMOIR1')).toEqual({
      aisle: null,
      bay: null,
      level: null,
      slot: null,
    });
  });

  it('ne décompose pas un double emplacement', () => {
    expect(parseLocationCode('16-7-A/16-6-B')).toEqual({
      aisle: null,
      bay: null,
      level: null,
      slot: null,
    });
  });

  it('permet un tri numérique, et non lexicographique', () => {
    // C'est tout l'intérêt de la décomposition : en tri texte, "10-…" passerait
    // avant "2-…", ce qui ferait zigzaguer le magasinier dans l'entrepôt.
    const codes = ['10-1-A-1', '2-1-A-1', '1-1-A-1'];
    const sorted = codes
      .map((code) => ({ code, parts: parseLocationCode(code) }))
      .sort((a, b) => (a.parts.aisle ?? 0) - (b.parts.aisle ?? 0))
      .map((entry) => entry.code);

    expect(sorted).toEqual(['1-1-A-1', '2-1-A-1', '10-1-A-1']);
  });
});

describe('levenshteinDistance', () => {
  it('renvoie 0 pour deux chaînes identiques', () => {
    expect(levenshteinDistance('ARMOIRE', 'ARMOIRE')).toBe(0);
  });

  it('compte les insertions et substitutions', () => {
    expect(levenshteinDistance('ARMOIR', 'ARMOIRE')).toBe(1);
    expect(levenshteinDistance('ARMOIRE', 'ARMOIRA')).toBe(1);
  });

  it('abandonne au-delà du seuil', () => {
    expect(levenshteinDistance('ABC', 'ZZZZZZZZZZ', 2)).toBe(3);
  });
});

describe('isLikelyVariant', () => {
  it('repère les variantes orthographiques du fichier client', () => {
    expect(isLikelyVariant('ARMOIR CONSM', 'ARMOIRE CONSM')).toBe(true);
  });

  it('ignore deux codes identiques', () => {
    expect(isLikelyVariant('ARMOIRE CONSM', 'armoire  consm')).toBe(false);
  });

  it('ne confond jamais deux emplacements structurés voisins', () => {
    // 1-1-A et 1-1-B sont à distance 1 mais désignent deux niveaux différents :
    // les signaler comme doublons provoquerait des fusions catastrophiques.
    expect(isLikelyVariant('1-1-A-7', '1-1-B-7')).toBe(false);
    expect(isLikelyVariant('10-1-A-1', '10-1-A-2')).toBe(false);
  });

  it('ignore les libellés trop courts pour être concluants', () => {
    expect(isLikelyVariant('ABC', 'ABD')).toBe(false);
  });
});
