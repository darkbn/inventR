import { describe, expect, it } from 'vitest';

import { formatAmount, formatPercent, formatQuantity, formatVariance } from './format';

describe('formatQuantity', () => {
  it('omet les décimales inutiles', () => {
    expect(formatQuantity(42)).toBe('42');
  });

  it('conserve jusqu’à trois décimales', () => {
    // 192,024 est une valeur réelle du fichier client : l'arrondir fausserait
    // l'inventaire.
    expect(formatQuantity(192.024)).toBe('192,024');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(formatQuantity(null)).toBe('—');
    expect(formatQuantity(undefined)).toBe('—');
  });

  it('distingue zéro d’une valeur absente', () => {
    expect(formatQuantity(0)).toBe('0');
  });
});

describe('formatVariance', () => {
  it('préfixe explicitement un surplus', () => {
    // Le signe « + » lève l'ambiguïté : sans lui, 5 pourrait se lire comme un
    // manque de 5 selon le contexte.
    expect(formatVariance(5)).toBe('+5');
  });

  it('utilise un vrai signe moins pour un manque', () => {
    expect(formatVariance(-5)).toBe('−5');
  });

  it('n’affiche aucun signe pour un écart nul', () => {
    expect(formatVariance(0)).toBe('0');
  });

  it('gère les écarts décimaux', () => {
    expect(formatVariance(-0.5)).toBe('−0,5');
  });
});

describe('formatAmount', () => {
  it('affiche deux décimales et sépare les milliers', () => {
    // Intl en fr-FR sépare les milliers par une espace fine insécable
    // (U+202F), et non par une espace ordinaire.
    expect(formatAmount(5689.2846)).toBe('5 689,28');
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(formatAmount(undefined)).toBe('—');
  });
});

describe('formatPercent', () => {
  it('ajoute le symbole', () => {
    expect(formatPercent(62.4)).toBe('62,4 %');
  });
});
