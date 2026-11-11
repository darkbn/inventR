#!/bin/sh
# ------------------------------------------------------------------------------
# Point d'entrée de l'API en conteneur.
#
# Les migrations sont appliquées AVANT le démarrage du serveur : l'API ne doit
# jamais servir de requêtes sur un schéma obsolète. `migrate deploy` n'applique
# que des migrations déjà committées et ne génère jamais de SQL à la volée, ce
# qui le rend sûr en production.
# ------------------------------------------------------------------------------
set -eu

echo "[entrypoint] Application des migrations Prisma…"
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] Exécution du seed…"
  node dist/prisma/seed.js || echo "[entrypoint] Seed ignoré (déjà appliqué ou indisponible)"
fi

echo "[entrypoint] Démarrage de l'API…"
exec "$@"
