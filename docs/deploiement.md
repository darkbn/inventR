# Déploiement d'InventAir en production

Cible : un serveur Linux unique (2 vCPU / 4 Go suffisent pour 8 000 lignes et une
vingtaine de postes), Docker Engine 24+ et le plugin Compose v2.

Tout passe par deux fichiers superposés. Le fichier de base décrit les services,
la surcouche de production restreint l'exposition réseau et ajoute le proxy, les
certificats et les sauvegardes.

```bash
export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
```

Les commandes ci-dessous supposent cette variable définie. Sans elle, répétez
`-f docker-compose.yml -f docker-compose.prod.yml` à chaque appel.

## 1. Préparer le serveur

```bash
git clone <dépôt> /opt/inventair && cd /opt/inventair
cp .env.example .env
```

Renseigner `.env`. **Aucun secret n'est versionné** : toutes les valeurs
`CHANGEME` doivent être remplacées avant le premier démarrage.

```bash
# Deux secrets DIFFÉRENTS, 48 octets chacun
openssl rand -base64 48   # → JWT_ACCESS_SECRET
openssl rand -base64 48   # → JWT_REFRESH_SECRET
openssl rand -base64 24   # → POSTGRES_PASSWORD
```

| Variable | Valeur en production |
|---|---|
| `NODE_ENV` | `production` |
| `PUBLIC_DOMAIN` | le domaine réel, déjà résolu en DNS vers ce serveur |
| `LETSENCRYPT_EMAIL` | une boîte réellement relevée (avis d'expiration) |
| `POSTGRES_PASSWORD` | généré, jamais le mot de passe de développement |
| `JWT_*_SECRET` | générés, distincts l'un de l'autre |
| `SEED_ADMIN_PASSWORD` | mot de passe fort, **à changer à la première connexion** |
| `RUN_SEED_ON_START` | `true` pour le premier démarrage seulement |
| `CORS_ORIGINS` | laissé vide : la surcouche le force à `https://$PUBLIC_DOMAIN` |

Le DNS doit pointer vers le serveur **avant** l'étape 3 : Let's Encrypt valide
la possession du domaine par une requête HTTP entrante.

## 2. Démarrer le socle

```bash
docker compose up -d --build postgres api web
docker compose logs -f api
```

Le point d'entrée de l'API applique `prisma migrate deploy` avant d'ouvrir le
port : le serveur ne répond jamais sur un schéma obsolète. Attendre la ligne
`Démarrage de l'API…` puis un conteneur `healthy` :

```bash
docker compose ps
```

Une fois le compte administrateur créé, **repasser `RUN_SEED_ON_START=false`**
dans `.env` et relancer `docker compose up -d api`.

## 3. Certificat TLS

```bash
chmod +x docker/nginx/init-letsencrypt.sh
set -a; . ./.env; set +a
STAGING=1 ./docker/nginx/init-letsencrypt.sh     # répétition générale
./docker/nginx/init-letsencrypt.sh               # pour de bon
```

Faire le premier essai avec `STAGING=1`. Let's Encrypt plafonne à cinq échecs
par heure et par domaine, et un DNS mal propagé épuise ce quota en quelques
minutes. Entre les deux passes, supprimer le certificat de test :

```bash
docker compose run --rm --entrypoint sh certbot -c "rm -rf /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal"
```

Le renouvellement est ensuite automatique : le conteneur `certbot` le tente
toutes les 12 h et le proxy recharge sa configuration toutes les 6 h, sans
couper les connexions en cours.

## 4. Tout démarrer

```bash
docker compose up -d --build
docker compose ps
curl -fsS https://$PUBLIC_DOMAIN/api/v1/health
```

Services attendus : `postgres`, `api`, `web`, `proxy`, `certbot`, `backup`.
`pgadmin` ne doit **pas** apparaître — son profil `tools` n'est pas activé.

## Exposition réseau

Seul le proxy publie des ports (80 et 443). Vérification :

```bash
docker compose ps --format '{{.Service}}\t{{.Ports}}'
```

`postgres`, `api` et `web` doivent afficher une colonne de ports **vide**. La
base n'est joignable que depuis le réseau Docker privé ; pour l'interroger
depuis le serveur, passer par le conteneur :

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Au niveau du pare-feu, n'ouvrir que 22, 80 et 443.

## Sauvegardes

Un dump au format `custom` est produit chaque jour dans le volume `backups`,
avec purge au-delà de `BACKUP_RETENTION_DAYS` (14 par défaut).

```bash
# Sauvegarde immédiate, hors cycle
docker compose run --rm --entrypoint /bin/sh backup /scripts/pg_backup.sh

# Lister ce qui existe
docker compose run --rm --entrypoint /bin/sh backup /scripts/pg_restore.sh --list

# Copier les sauvegardes hors du serveur — indispensable : un volume Docker
# sur le même disque ne protège de rien en cas de perte de la machine
docker run --rm -v inventair_backups:/b -v "$PWD":/out alpine \
  tar czf /out/inventair-backups.tar.gz -C /b .
```

### Restauration

```bash
docker compose stop api        # aucune écriture pendant l'opération
docker compose run --rm --entrypoint /bin/sh backup \
  /scripts/pg_restore.sh inventair-20261023-030000.dump
docker compose up -d api
curl -fsS https://$PUBLIC_DOMAIN/api/v1/health
```

Le script prend lui-même un dump de l'état courant avant d'écraser quoi que ce
soit, et exige la saisie de `RESTAURER`. Redémarrer l'API rejoue les migrations,
ce qui réaligne une sauvegarde plus ancienne que le code déployé.

**Une sauvegarde non testée n'est pas une sauvegarde.** Rejouer la procédure
complète sur un serveur de recette au moins une fois par trimestre.

## Mise à jour

```bash
git pull
docker compose up -d --build
```

Les migrations s'appliquent à l'entrypoint de l'API. Prendre une sauvegarde
manuelle avant toute mise à jour portant une migration destructive.

## Exploitation courante

```bash
docker compose logs -f api            # logs JSON structurés (Pino)
docker compose logs -f proxy
docker compose restart api
docker stats --no-stream
```

Les logs sont plafonnés à 10 Mo × 5 fichiers par service : ils ne peuvent pas
saturer le disque.

| Symptôme | Piste |
|---|---|
| `502 Bad Gateway` | l'API n'est pas `healthy` → `docker compose logs api` |
| `413 Request Entity Too Large` | import au-delà de 32 Mo → `client_max_body_size` dans `docker/nginx/proxy.conf.template` et `UPLOAD_MAX_FILE_SIZE_MB` |
| `429 Too Many Requests` | limitation de débit : `THROTTLE_*` dans `.env`, et les zones `limit_req` du proxy |
| Certificat expiré | `docker compose logs certbot`, puis `docker compose run --rm certbot renew --force-renewal` |
| Migration bloquée | `docker compose logs api` ; restaurer la sauvegarde la plus récente si nécessaire |

## Application Android

L'APK se construit séparément (voir [`apps/mobile/README.md`](../apps/mobile/README.md)).
En production, l'adresse à saisir sur l'écran de connexion est
`https://<domaine>/api/v1`. En HTTPS, la restriction de trafic en clair du
fichier `network_security_config.xml` ne s'applique pas.
