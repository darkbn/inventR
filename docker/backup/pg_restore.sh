#!/bin/sh
# ------------------------------------------------------------------------------
# Restauration d'une sauvegarde InventAir.
#
#   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
#     run --rm --entrypoint /bin/sh backup /scripts/pg_restore.sh --list
#
#   … /scripts/pg_restore.sh inventair-20261023-030000.dump
#
# LA RESTAURATION ÉCRASE LE SCHÉMA « inventory » EXISTANT.
# Le script exige donc une confirmation explicite, et prend par sécurité une
# sauvegarde de l'état courant avant de toucher à quoi que ce soit.
#
# Arrêtez l'API avant de restaurer :
#   docker compose … stop api
# puis relancez-la ensuite. Restaurer sous une API active laisserait des
# connexions ouvertes sur des objets en cours de suppression.
# ------------------------------------------------------------------------------
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB="${PGDATABASE:-inventair}"

usage() {
  cat <<'EOF'
Usage :
  pg_restore.sh --list                     liste les sauvegardes disponibles
  pg_restore.sh <fichier.dump> [--yes]     restaure la sauvegarde indiquée

Le fichier peut être un nom simple (cherché dans $BACKUP_DIR) ou un chemin.
--yes saute la confirmation interactive (scripts, procédure de reprise).
EOF
}

if [ $# -eq 0 ]; then
  usage
  exit 1
fi

if [ "$1" = "--list" ]; then
  echo "Sauvegardes disponibles dans ${BACKUP_DIR} :"
  echo ""
  # Les noms contiennent un horodatage triable : l'ordre alphabétique est
  # l'ordre chronologique.
  find "$BACKUP_DIR" -name 'inventair-*.dump' -type f | sort | while read -r f; do
    printf '  %-40s %8s  %s\n' "$(basename "$f")" "$(du -h "$f" | cut -f1)" \
      "$(date -r "$f" '+%Y-%m-%d %H:%M')"
  done
  echo ""
  exit 0
fi

SOURCE="$1"
[ -f "$SOURCE" ] || SOURCE="${BACKUP_DIR}/$1"

if [ ! -f "$SOURCE" ]; then
  echo "Sauvegarde introuvable : $1" >&2
  echo "Utilisez « pg_restore.sh --list » pour voir ce qui est disponible." >&2
  exit 1
fi

# Vérifie que le fichier est bien un dump lisible avant d'annoncer quoi que ce
# soit : inutile de détruire un schéma pour découvrir ensuite que l'archive est
# tronquée.
if ! pg_restore --list "$SOURCE" >/dev/null 2>&1; then
  echo "Le fichier n'est pas une archive pg_dump valide : $SOURCE" >&2
  exit 1
fi

echo "Source      : $SOURCE"
echo "Destination : ${PGHOST:-local}/${DB}, schéma « inventory »"
echo ""
echo "ATTENTION : le schéma « inventory » actuel sera supprimé et remplacé."

if [ "${2:-}" != "--yes" ]; then
  printf 'Taper RESTAURER pour confirmer : '
  read -r answer
  if [ "$answer" != "RESTAURER" ]; then
    echo "Abandon."
    exit 1
  fi
fi

# --- Filet de sécurité ----------------------------------------------------------
safety="${BACKUP_DIR}/avant-restauration-$(date '+%Y%m%d-%H%M%S').dump"
echo ""
echo "==> Sauvegarde de l'état actuel : $safety"
pg_dump --format=custom --compress=6 --file="$safety" \
  || echo "    (impossible — base vide ou inaccessible, on poursuit)"

# --- Restauration -----------------------------------------------------------------
echo "==> Restauration"
# --clean --if-exists : supprime les objets existants avant de les recréer.
# --no-owner --no-privileges : le propriétaire peut différer d'un hôte à l'autre
# (rôle applicatif distinct), ce qui ne doit pas faire échouer la reprise.
# --exit-on-error : une restauration à moitié faite est pire qu'un échec net.
pg_restore \
  --dbname="$DB" \
  --clean --if-exists \
  --no-owner --no-privileges \
  --exit-on-error \
  "$SOURCE"

echo ""
echo "Restauration terminée."
echo ""
echo "À faire maintenant :"
echo "  1. Redémarrer l'API   : docker compose … up -d api"
echo "     (son point d'entrée rejoue « prisma migrate deploy », ce qui aligne"
echo "      le schéma si la sauvegarde est plus ancienne que le code déployé)"
echo "  2. Vérifier la santé  : curl -fsS https://<domaine>/api/v1/health"
echo "  3. Contrôler un total de campagne connu avant de rouvrir le service."
