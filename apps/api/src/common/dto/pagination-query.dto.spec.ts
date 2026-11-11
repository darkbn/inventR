import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { MAX_PAGE_SIZE, PaginationQueryDto } from './pagination-query.dto';

/**
 * Ces plafonds font partie du contrat public de l'API : l'application Android
 * les a câblés dans `AppConfig`, hors de portée du compilateur TypeScript.
 * Les abaisser casserait le téléchargement d'une liste sur le terrain sans
 * qu'aucun test d'intégration ne s'en aperçoive — la défaillance ne se produit
 * qu'à la frontière entre les deux projets.
 *
 * Le pendant côté mobile est dans `apps/mobile/test/offline_logic_test.dart`,
 * groupe « contrat avec l'API ».
 */
describe('PaginationQueryDto', () => {
  const validate = (query: Record<string, unknown>) =>
    validateSync(plainToInstance(PaginationQueryDto, query));

  it('plafonne les pages à 200 éléments', () => {
    // Valeur figée : l'application Android pagine exactement à 200.
    expect(MAX_PAGE_SIZE).toBe(200);
  });

  it('accepte la taille de page utilisée par l’application Android', () => {
    expect(validate({ page: 1, limit: 200 })).toHaveLength(0);
  });

  it('refuse au-delà du plafond', () => {
    const errors = validate({ page: 1, limit: MAX_PAGE_SIZE + 1 });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.constraints?.max).toBe('Le maximum est de 200 éléments par page.');
  });

  it('applique ses valeurs par défaut en l’absence de paramètres', () => {
    const dto = plainToInstance(PaginationQueryDto, {});

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(25);
    expect(dto.skip).toBe(0);
  });

  it('calcule le décalage SQL de la page demandée', () => {
    const dto = plainToInstance(PaginationQueryDto, { page: 40, limit: 200 });

    // 40ᵉ page d'une liste de 7 961 lignes : la dernière que télécharge le mobile.
    expect(dto.skip).toBe(7800);
  });

  it('refuse une page nulle ou négative', () => {
    expect(validate({ page: 0 })).toHaveLength(1);
    expect(validate({ page: -3 })).toHaveLength(1);
  });
});
