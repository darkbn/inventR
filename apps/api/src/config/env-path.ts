import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Localise le fichier .env unique, situé à la racine du monorepo (il alimente
 * aussi Docker Compose). On remonte l'arborescence depuis le répertoire courant
 * du processus afin que l'API démarre indifféremment depuis `apps/api`, depuis la
 * racine ou depuis `dist/`.
 *
 * Renvoie `undefined` si aucun fichier n'est trouvé : en conteneur et en CI, les
 * variables sont injectées directement dans l'environnement.
 */
export function resolveRootEnvPath(): string | undefined {
  let dir = process.cwd();

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, '.env');
    if (existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}
