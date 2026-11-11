import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';

import { buildOpenApiDocument } from '../src/config/openapi';

import { apiPath, createTestApp } from './helpers/test-app';

/**
 * Garde-fou : la génération du document OpenAPI échoue sur des erreurs que ni le
 * compilateur ni les tests de routes ne voient — typiquement une dépendance
 * circulaire entre schémas. Sans ce test, le défaut ne se manifeste qu'au
 * démarrage de l'API, c'est-à-dire en production.
 */
describe('Document OpenAPI (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    document = buildOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('se construit sans erreur', () => {
    expect(document.openapi).toMatch(/^3\./);
    expect(document.info.title).toBe('InventAir — API');
  });

  it('expose les routes attendues', () => {
    const routes = Object.keys(document.paths);

    for (const expected of [
      '/auth/login',
      '/auth/refresh',
      '/auth/me',
      '/users',
      '/users/{id}/role',
      '/users/{id}/status',
      '/warehouses',
      '/locations',
      '/locations/{id}/merge',
      '/articles',
      '/articles/by-code/{code}',
      '/categories',
      '/campaign-types',
      '/inventory-methods',
      '/activity-logs',
      '/health',
    ]) {
      expect(routes).toContain(apiPath(expected));
    }
  });

  it('décrit correctement les réponses paginées', () => {
    const schema = document.paths[apiPath('/users')]?.get?.responses['200'];
    expect(JSON.stringify(schema)).toContain('UserDto');
  });

  it('déclare le schéma d’authentification Bearer', () => {
    expect(document.components?.securitySchemes?.['bearer']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
  });

  it('n’expose jamais le hash de mot de passe dans un schéma', () => {
    expect(JSON.stringify(document.components?.schemas ?? {})).not.toContain('passwordHash');
  });
});
