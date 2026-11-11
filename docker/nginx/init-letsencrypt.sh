#!/bin/sh
# ------------------------------------------------------------------------------
# Premier démarrage : obtention du certificat Let's Encrypt.
#
# Le problème à résoudre est un œuf-et-poule : nginx refuse de démarrer sans
# certificat, et certbot a besoin de nginx pour répondre au défi HTTP-01. On
# pose donc d'abord un certificat auto-signé jetable, on démarre le proxy, puis
# on laisse certbot le remplacer par le vrai.
#
# Usage :
#   PUBLIC_DOMAIN=inventair.exemple.dz LETSENCRYPT_EMAIL=ops@exemple.dz \
#     ./docker/nginx/init-letsencrypt.sh
#
#   Ajouter STAGING=1 pour utiliser l'environnement de test de Let's Encrypt.
#   À faire au moins une fois : la production plafonne à 5 échecs par heure et
#   par domaine, et un DNS mal propagé consomme ce quota très vite.
# ------------------------------------------------------------------------------
set -eu

: "${PUBLIC_DOMAIN:?PUBLIC_DOMAIN doit être défini (ex. inventair.exemple.dz)}"
: "${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL doit être défini}"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
LIVE_DIR="/etc/letsencrypt/live/${PUBLIC_DOMAIN}"

echo "==> Domaine : ${PUBLIC_DOMAIN}"

# --- 1. Certificat provisoire ---------------------------------------------------
echo "==> Pose d'un certificat auto-signé provisoire"
$COMPOSE run --rm --entrypoint sh certbot -c "
  mkdir -p '${LIVE_DIR}' /var/www/certbot
  if [ ! -f '${LIVE_DIR}/fullchain.pem' ]; then
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
      -keyout '${LIVE_DIR}/privkey.pem' \
      -out '${LIVE_DIR}/fullchain.pem' \
      -subj '/CN=${PUBLIC_DOMAIN}'
  else
    echo 'Certificat déjà présent : étape ignorée.'
  fi
"

# --- 2. Démarrage du proxy ------------------------------------------------------
echo "==> Démarrage du reverse proxy"
$COMPOSE up -d proxy

# --- 3. Demande du vrai certificat ----------------------------------------------
echo "==> Demande du certificat à Let's Encrypt"

STAGING_FLAG=""
if [ "${STAGING:-0}" = "1" ]; then
  echo "    (environnement de TEST — le certificat ne sera pas reconnu par les navigateurs)"
  STAGING_FLAG="--staging"
fi

# --force-renewal : le certificat auto-signé posé plus haut occupe la place et
# certbot le considérerait sinon comme valide.
$COMPOSE run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email "${LETSENCRYPT_EMAIL}" \
  --agree-tos --no-eff-email \
  --force-renewal \
  $STAGING_FLAG \
  -d "${PUBLIC_DOMAIN}"

# --- 4. Rechargement -------------------------------------------------------------
echo "==> Rechargement de nginx avec le certificat définitif"
$COMPOSE exec proxy nginx -s reload

echo ""
echo "Terminé. https://${PUBLIC_DOMAIN} est en service."
echo "Le renouvellement est automatique : le conteneur « certbot » le tente"
echo "toutes les 12 h, et le proxy recharge sa configuration toutes les 6 h."
