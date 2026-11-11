/**
 * Génère les types TypeScript du contrat d'API depuis le document OpenAPI.
 *
 * L'API doit être démarrée : le script interroge /docs-json plutôt que de lire
 * un fichier figé, afin que les types correspondent toujours au code réellement
 * déployé.
 *
 *   pnpm --filter @inventair/web gen:api
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.OPENAPI_URL ?? 'http://localhost:3000/api/v1/docs-json';
const target = path.join(root, 'src', 'api', 'schema.d.ts');

try {
  const ast = await openapiTS(new URL(source));
  const banner = [
    '/**',
    ' * Fichier généré — ne pas modifier à la main.',
    ' * Source : ' + source,
    ' * Régénérer avec : pnpm --filter @inventair/web gen:api',
    ' */',
    '',
  ].join('\n');

  await writeFile(target, banner + astToString(ast), 'utf8');
  console.log(`✓ Types écrits dans ${path.relative(root, target)}`);
} catch (error) {
  console.error("✗ Génération impossible. L'API est-elle démarrée sur " + source + ' ?');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
