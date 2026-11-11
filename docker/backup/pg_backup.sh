#!/bin/sh
# ------------------------------------------------------------------------------
# Sauvegarde de la base InventAir.
#
#   pg_backup.sh            une sauvegarde, puis sortie
#   pg_backup.sh --loop     une sauvegarde toutes les BACKUP_INTERVAL_SECONDS
#                           (mode utilisé par le conteneur « backup »)
#
# Variables (toutes optionnelles sauf la connexion) :
#   PGHOST PGUSER PGPASSWORD PGDATABASE   connexion (libpg)
#   BACKUP_DIR=/backups                   destination
#   BACKUP_RETENTION_DAYS=14              purge au-delà
#   BACKUP_INTERVAL_SECONDS=86400         période en mode --loop
#
# Format « custom » (-Fc) plutôt que SQL brut : compressé, et surtout
# restaurable sélectivement (une seule table, ou le schéma sans les données).
# ------------------------------------------------------------------------------
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

backup_once() {
  mkdir -p "$BACKUP_DIR"

  stamp=$(date '+%Y%m%d-%H%M%S')
  target="${BACKUP_DIR}/inventair-${stamp}.dump"
  # On écrit d'abord sous un nom temporaire : un dump interrompu ne doit jamais
  # se retrouver dans la liste avec l'apparence d'une sauvegarde valide.
  partial="${target}.partial"

  log "Sauvegarde de « ${PGDATABASE:-inventair} » vers ${target}"

  if pg_dump --format=custom --compress=6 --file="$partial"; then
    mv "$partial" "$target"
    size=$(du -h "$target" | cut -f1)
    log "Terminé : ${size}"
  else
    rm -f "$partial"
    log "ÉCHEC de la sauvegarde"
    return 1
  fi

  # Purge. Elle n'a lieu qu'APRÈS une sauvegarde réussie : si la base est
  # injoignable plusieurs jours, mieux vaut garder des dumps périmés que de se
  # retrouver sans aucune copie.
  if [ "$RETENTION_DAYS" -gt 0 ]; then
    removed=$(find "$BACKUP_DIR" -name 'inventair-*.dump' -type f \
                   -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
    [ "$removed" -gt 0 ] && log "Purge : ${removed} sauvegarde(s) de plus de ${RETENTION_DAYS} jours"
  fi

  log "Sauvegardes présentes : $(find "$BACKUP_DIR" -name 'inventair-*.dump' -type f | wc -l)"
}

if [ "${1:-}" = "--loop" ]; then
  log "Mode périodique : une sauvegarde toutes les ${INTERVAL} s, rétention ${RETENTION_DAYS} j"
  # Permet au conteneur de s'arrêter proprement sans attendre la fin du sleep.
  trap 'log "Arrêt demandé"; exit 0' TERM INT
  while :; do
    # Une erreur ne doit pas tuer la boucle : le réseau ou la base peuvent être
    # momentanément indisponibles, la tentative suivante aura lieu.
    backup_once || log "Nouvelle tentative au prochain cycle"
    sleep "$INTERVAL" &
    wait $!
  done
else
  backup_once
fi
