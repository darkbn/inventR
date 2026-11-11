/**
 * Test de démarrage du binaire compilé.
 *
 * Les tests d'intégration montent l'application via le module de test de Nest,
 * dont la résolution de modules diffère de celle de Node en exécution réelle :
 * une dépendance transitive non déclarée y passe inaperçue et ne se manifeste
 * qu'au lancement de `node dist/main.js` — c'est-à-dire en production.
 *
 * Ce script démarre le vrai binaire, interroge /health, puis s'arrête.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(apiRoot, 'dist', 'main.js');

if (!existsSync(entrypoint)) {
  console.error(`✗ ${entrypoint} absent. Lancez « pnpm build » au préalable.`);
  process.exit(1);
}

// Chargement du .env de la racine, comme le fait l'application elle-même.
let dir = apiRoot;
for (let depth = 0; depth < 5; depth += 1) {
  const candidate = path.join(dir, '.env');
  if (existsSync(candidate)) {
    for (const line of readFileSync(candidate, 'utf8').split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match) process.env[match[1]] ??= match[2];
    }
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}

const port = Number.parseInt(process.env.SMOKE_PORT ?? '3999', 10);
const prefix = process.env.API_PREFIX ?? 'api/v1';
const healthUrl = `http://127.0.0.1:${port}/${prefix}/health`;

const child = spawn(process.execPath, [entrypoint], {
  cwd: apiRoot,
  env: { ...process.env, API_PORT: String(port), LOG_LEVEL: 'warn', LOG_PRETTY: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => (output += chunk.toString()));
child.stderr.on('data', (chunk) => (output += chunk.toString()));

let exitedEarly = false;
child.on('exit', (code) => {
  if (code !== 0) exitedEarly = true;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  for (let attempt = 1; attempt <= 40; attempt += 1) {
    if (exitedEarly) break;

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        const body = await response.json();
        console.log(`✓ L'API démarre et répond : ${JSON.stringify(body.checks)}`);
        child.kill();
        return;
      }
    } catch {
      // Le serveur n'écoute pas encore.
    }

    await sleep(500);
  }

  console.error("✗ L'API n'a pas démarré ou n'a pas répondu sur /health.");
  console.error(output.slice(-3000));
  child.kill();
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  child.kill();
  process.exit(1);
});
