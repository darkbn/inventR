#!/usr/bin/env node
/**
 * Génère le client Prisma après une installation de dépendances.
 *
 * Pourquoi ce script plutôt qu'un simple `"postinstall": "prisma generate"` :
 *
 * — **Le postinstall de `@prisma/client` ne suffit pas.** Dans un monorepo pnpm,
 *   le paquet est installé dans le magasin partagé, loin de
 *   `apps/api/prisma/schema.prisma`. Ne trouvant pas de schéma, il produit un
 *   client vide. L'erreur ne se manifeste qu'au premier import — par exemple
 *   `Module '@prisma/client' has no exported member 'Role'` au moment du seed,
 *   message qui ne désigne pas sa propre cause.
 *
 * — **Un `prisma generate` inconditionnel casserait l'image Docker.** La couche
 *   de dépendances n'embarque que les manifestes `package.json`, volontairement :
 *   c'est ce qui lui permet de rester en cache tant que les dépendances ne
 *   changent pas. Le schéma n'y est pas encore, la génération échouerait, et
 *   avec elle la construction. Le Dockerfile appelle `prisma generate`
 *   explicitement aux étapes où le schéma est présent.
 *
 * On génère donc uniquement si le schéma est là, et l'on échoue bruyamment si
 * la génération elle-même se passe mal : une erreur avalée ici réapparaîtrait
 * plus tard sous une forme bien moins lisible.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.dirname(prismaDir);

if (!existsSync(path.join(prismaDir, 'schema.prisma'))) {
  // Cas normal : couche de dépendances Docker. Rien à signaler.
  process.exit(0);
}

/**
 * Chemin du point d'entrée de la CLI Prisma.
 *
 * On résout le fichier JavaScript plutôt que le binaire `node_modules/.bin` :
 * sous Windows celui-ci est un `.cmd`, qui exige un shell, lequel déclenche un
 * avertissement de dépréciation Node à chaque installation. Lancer directement
 * le script avec l'interpréteur courant évite le shell, et fonctionne de la
 * même façon sur les trois systèmes.
 *
 * `prisma/build/index.js` est un chemin interne à Prisma : s'il venait à
 * changer, on retombe sur le binaire du PATH, que le gestionnaire de paquets
 * fournit de toute façon pendant un postinstall.
 */
function resolveCli() {
  const require = createRequire(import.meta.url);

  try {
    return { command: process.execPath, args: [require.resolve('prisma/build/index.js')] };
  } catch {
    return { command: 'prisma', args: [] };
  }
}

const cli = resolveCli();
const result = spawnSync(cli.command, [...cli.args, 'generate'], {
  cwd: apiDir,
  stdio: 'inherit',
  // Nécessaire uniquement pour le repli sur le binaire du PATH, qui est un
  // `.cmd` sous Windows.
  shell: cli.command === 'prisma' && process.platform === 'win32',
});

if (result.error || (result.status ?? 1) !== 0) {
  console.error(
    '\n[InventAir] La génération du client Prisma a échoué.\n' +
      (result.error ? `  ${result.error.message}\n` : '') +
      '  Sans elle, l’API et le seed échoueront sur des types manquants\n' +
      '  (« has no exported member Role »). Relancez : pnpm db:generate\n',
  );
  process.exit(1);
}
