import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/**
 * Construit le document OpenAPI.
 *
 * Extrait de `main.ts` pour être exécutable par les tests : la génération du
 * document échoue sur des erreurs que ni le compilateur ni les tests de routes
 * ne détectent (dépendance circulaire entre schémas, modèle non enregistré).
 * Mieux vaut qu'un test échoue que l'API refuse de démarrer en production.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('InventAir — API')
    .setDescription(
      "API de gestion d'inventaire physique : campagnes, listes, comptages, imports et rapports.",
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Access token JWT' },
      'bearer',
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}
