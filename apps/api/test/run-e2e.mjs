/**
 * Lanceur des tests d'intégration.
 *
 * Rôle : garantir que les tests s'exécutent TOUJOURS sur une base dédiée, jamais
 * sur celle de développement. Il dérive l'URL de test depuis DATABASE_URL (en
 * suffixant le nom de la base par `_test`), applique les migrations, puis lance
 * Jest. Écrit en Node plutôt qu'en script shell pour fonctionner à l'identique
 * sous Windows, Linux et en CI.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(here, '..');

function loadRootEnv() {
  let dir = apiRoot;
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
}

loadRootEnv();

/** Transforme `…/inventair?schema=inventory` en `…/inventair_test?schema=inventory`. */
function deriveTestDatabaseUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  const database = url.pathname.replace(/^\//, '');

  if (database === '') {
    throw new Error("DATABASE_URL ne désigne aucune base de données.");
  }

  url.pathname = `/${database.endsWith('_test') ? database : `${database}_test`}`;
  return url.toString();
}

const sourceUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

if (!sourceUrl) {
  console.error('DATABASE_URL (ou DATABASE_URL_TEST) doit être défini.');
  process.exit(1);
}

const testDatabaseUrl = deriveTestDatabaseUrl(sourceUrl);
const parsed = new URL(testDatabaseUrl);
const testDatabaseName = parsed.pathname.replace(/^\//, '').split('?')[0];

if (!/test/i.test(testDatabaseName)) {
  console.error(`Refus d'exécuter les tests sur la base « ${testDatabaseName} ».`);
  process.exit(1);
}

const childEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl,
  // La limite de production (10 connexions/minute) ferait échouer la suite dès la
  // onzième connexion. On la relève ici ; le plafonnement lui-même est vérifié par
  // throttle.e2e-spec.ts, qui l'atteint délibérément.
  THROTTLE_TTL: '60000',
  THROTTLE_LIMIT: '10000',
  THROTTLE_AUTH_TTL: '60000',
  THROTTLE_AUTH_LIMIT: '100',
  // Les tests ne doivent pas noyer leur propre sortie sous les logs HTTP.
  LOG_LEVEL: 'silent',
  LOG_PRETTY: 'false',
};

function run(command, args, label) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, {
    cwd: apiRoot,
    env: childEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Base de test : ${testDatabaseName}`);

// `migrate deploy` crée la base si elle n'existe pas et applique les migrations
// déjà committées, sans jamais générer de SQL à la volée.
run('npx', ['prisma', 'migrate', 'deploy'], 'Application des migrations sur la base de test');
run('npx', ['jest', '--config', './test/jest-e2e.json', '--runInBand', ...process.argv.slice(2)], 'Tests d’intégration');
