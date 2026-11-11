import { existsSync } from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Le fichier .env est unique et vit à la racine du monorepo (il alimente aussi
 * Docker Compose). Depuis l'introduction de prisma.config.ts, Prisma ne charge
 * plus .env automatiquement : on remonte l'arborescence jusqu'à le trouver, ce qui
 * rend les commandes Prisma utilisables aussi bien depuis apps/api que depuis la
 * racine.
 */
function loadRootEnv(): void {
  let dir = __dirname;

  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) {
      loadDotenv({ path: candidate });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Pas de .env : on n'échoue pas ici car l'environnement peut être fourni
  // directement par le conteneur ou la CI.
}

loadRootEnv();

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node -P tsconfig.json prisma/seed.ts',
  },
});
