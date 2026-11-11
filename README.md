# InventAir

Application de gestion d'inventaire physique en entrepôt : pilotage web pour les
superviseurs et administrateurs, application Android pour la saisie terrain,
API REST partagée.

> **État d'avancement** — Étapes 1 à 7 terminées : socle, authentification,
> référentiels, cœur métier, fichiers, interface web et **application Android**.
> Reste le déploiement de production (étape 8).

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Base de données](#base-de-données)
- [Développement](#développement)
- [Déploiement](#déploiement)
- [Tests](#tests)
- [Documentation](#documentation)

## Architecture

```
InventAir/
├─ apps/
│  ├─ api/        API REST — NestJS 11, Prisma, PostgreSQL 17
│  ├─ web/        Interface web — React 18, Vite, Tailwind, Radix UI
│  └─ mobile/     Application Android — Flutter 3, Riverpod, Drift
├─ docker/        Entrypoint API, configuration Nginx, scripts de sauvegarde
├─ docs/          Documentation technique et métier
├─ samples/       Fichier d'inventaire de référence du client
└─ docker-compose.yml
```

Trois rôles : **ADMIN** (comptes, référentiels, journaux), **SUPERVISOR**
(campagnes, imports, clôtures, rapports), **USER** (comptage mobile sur les seules
listes qui lui sont attribuées).

## Prérequis

| Outil | Version | Remarque |
|---|---|---|
| Node.js | ≥ 20.11 | testé avec 24.16 |
| pnpm | ≥ 10 | `corepack enable` suffit |
| Docker | ≥ 24 | pour PostgreSQL |
| Flutter | 3.47+ | uniquement pour l'application Android |
| JDK | 17 | uniquement pour l'application Android |

## Installation

```bash
git clone https://github.com/darkbn/inventR.git InventAir
cd InventAir

# 1. Dépendances
pnpm install

# 2. Configuration (voir la section suivante)
cp .env.example .env
#    puis éditer .env — toutes les valeurs CHANGEME doivent être remplacées

# 3. Base de données
docker compose up -d postgres

# 4. Schéma et données initiales
pnpm db:deploy
pnpm db:seed
#    `pnpm install` a déjà généré le client Prisma. Si une commande se plaint
#    d'un type manquant (« has no exported member Role »), c'est qu'il n'a pas
#    été généré : relancer `pnpm db:generate`.

# 5. Démarrage de l'API
pnpm api:dev

# 6. Démarrage de l'interface web, dans un second terminal
pnpm web:dev
```

L'API écoute sur <http://localhost:3000/api/v1>, sa documentation interactive sur
<http://localhost:3000/api/v1/docs>, et l'interface web sur
<http://localhost:5173>.

En développement, le serveur Vite relaie `/api` vers l'API : le navigateur ne voit
qu'une seule origine, ce qui évite d'avoir à assouplir le CORS.

## Configuration

Toute la configuration passe par un **unique fichier `.env` à la racine**, utilisé
à la fois par Docker Compose, par l'API et par les commandes Prisma. Il n'est
jamais versionné.

Générer les secrets JWT (deux valeurs **différentes**) :

```bash
openssl rand -base64 48
```

Variables à ne pas laisser par défaut : `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `SEED_ADMIN_PASSWORD`, `PGADMIN_PASSWORD`.

L'API **refuse de démarrer** si une variable est absente ou invalide (secrets JWT de
moins de 32 caractères, port hors plage, etc.) : la configuration est validée au
démarrage par `apps/api/src/config/env.validation.ts`.

> **Port 5432 déjà utilisé ?** Si une instance PostgreSQL tourne déjà sur la
> machine, changez `POSTGRES_PORT` (par exemple `55432`) et reportez la même valeur
> dans `DATABASE_URL`.

## Base de données

PostgreSQL 17, schéma dédié `inventory`.

| Commande | Effet |
|---|---|
| `pnpm db:migrate` | Crée et applique une migration (développement) |
| `pnpm db:deploy` | Applique les migrations existantes (production, CI) |
| `pnpm db:seed` | Données initiales — idempotent |
| `pnpm db:studio` | Explorateur graphique Prisma |
| `pnpm db:reset` | **Détruit** et recrée la base (développement uniquement) |

### Ce que crée le seed

- le compte administrateur défini par les variables `SEED_ADMIN_*` ;
- les trois types de campagne : matière première, PDR, produits finis ;
- les deux méthodes d'inventaire (voir [docs/methodes-calcul.md](docs/methodes-calcul.md)) ;
- le magasin `19R01 — MAGASIN PDR BOUFARIK` et son emplacement virtuel
  `NON-LOCALISE`.

Le seed est **rejouable sans risque** : il ne réinitialise jamais le mot de passe
d'un compte existant.

### Intégrité

Au-delà des clés étrangères et des index, 22 contraintes `CHECK` interdisent au
niveau de la base les états incohérents : quantités négatives, campagne clôturée
sans date de clôture, réouverture sans motif, passage de campagne nul, email non
normalisé. Elles sont définies dans la migration
`prisma/migrations/*_business_constraints/`.

## Développement

```bash
pnpm api:dev          # API avec rechargement à chaud
pnpm api:build        # compilation
pnpm lint             # ESLint, zéro avertissement toléré
pnpm format           # Prettier
```

Conventions : TypeScript strict, `camelCase` (variables, fonctions),
`PascalCase` (classes, composants, types), `snake_case` (colonnes PostgreSQL).
Commits conventionnels (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`).
Aucune logique métier dans les contrôleurs ; tout calcul d'inventaire est
centralisé dans `InventoryCalculationService`.

### Services Docker

```bash
docker compose up -d postgres            # base seule (usage courant)
docker compose --profile tools up -d     # + pgAdmin sur http://localhost:5050
docker compose --profile full up -d      # + API conteneurisée
```

### Joindre le poste de développement depuis un autre appareil

Par défaut, Vite n'écoute que sur la boucle locale : le serveur est injoignable
depuis un téléphone ou une tablette, même si le port est ouvert sur le routeur.
Deux variables, dans `apps/web/.env.local` (non versionné), lèvent ce verrou :

```properties
DEV_EXPOSE=true
DEV_ALLOWED_HOSTS=mon-domaine.exemple.net,192.168.1.20
```

`DEV_ALLOWED_HOSTS` liste les valeurs acceptées dans l'en-tête `Host`. Vite
rejette les autres : c'est une protection contre le DNS rebinding, par laquelle
un site tiers ferait pointer son domaine vers `127.0.0.1` pour piloter le
serveur de développement depuis le navigateur de la victime.

**Un seul port suffit.** Le proxy `/api` de Vite relaie vers l'API : le
navigateur comme l'application Android peuvent tout faire passer par 5173, et
le port 3000 n'a pas à être publié.

Cette configuration reste un **dépannage**. Le serveur de développement n'est
pas durci et le trafic circule en clair : mots de passe et jetons JWT sont
lisibles par tout intermédiaire réseau. Pour une exposition durable, utiliser la
pile de production et son HTTPS (voir [Déploiement](#déploiement)).

## Import de fichiers

Le modèle officiel se télécharge sur `GET /api/v1/imports/template.xlsx`
(accessible sans authentification, pour pouvoir être récupéré depuis un poste non
connecté). Ses en-têtes reprennent **exactement** ceux de l'export ERP, de sorte
qu'un fichier extrait du système se dépose sans retouche.

| Colonne | Obligatoire | Règle |
|---|---|---|
| `Article` | oui | `AAAAA-9999`, suffixe lettre et préfixe à 4 lettres admis |
| `(Article (Désignation))` | oui | 255 caractères maximum |
| `Magasin` | oui | doit correspondre au magasin de la campagne |
| `Emplacement` | non | vide → emplacement virtuel `NON-LOCALISE` |
| `Quantite` | oui | ≥ 0, 3 décimales, virgule ou point |
| `Pmp` | non | ≥ 0, 4 décimales, figé sur la ligne |
| `(Unité (Désignation))`, `(Marque …)`, `(Ref. fabricant)` | non | |

Le dépôt **n'écrit rien** : il produit un rapport ligne par ligne, que le
superviseur examine avant d'appliquer. CSV accepté (séparateurs `;` ou `,`,
encodages UTF-8 et Windows-1252), colonnes inconnues ignorées, ligne d'en-tête
cherchée dans les dix premières lignes.

## Rapports et QR codes

| Route | Contenu |
|---|---|
| `GET /campaigns/:id/dashboard` | avancement, écarts valorisés, progression par liste et par opérateur |
| `GET /reports/campaigns/:id.xlsx` | 4 feuilles : synthèse, détail exhaustif, comptages, par opérateur |
| `GET /reports/campaigns/:id.pdf` | synthèse à signer et archiver |
| `GET /qr/articles/:code.png` | QR d'un article |
| `GET /qr/lists/:id/labels.pdf` | planche d'étiquettes, dans l'ordre physique de parcours |

Les montants ne sont jamais renvoyés au rôle `USER`.

## Interface web

| Écran | Rôles | Contenu |
|---|---|---|
| Connexion | — | identifiant ou e-mail |
| Accueil | tous | campagnes récentes, avancement, indicateurs |
| Campagnes | tous | liste filtrable ; détail avec tableau de bord, graphiques, clôture |
| Listes | tous | lignes triées dans l'ordre physique, filtres terrain, arbitrage des litiges |
| Import | ADMIN, SUPERVISOR | dépôt, rapport ligne par ligne, application |
| Articles, Magasins, Emplacements | ADMIN, SUPERVISOR | référentiels ; fusion des variantes (ADMIN) |
| Utilisateurs | ADMIN, SUPERVISOR | comptes, rôles, activation |
| Paramétrage, Journal | ADMIN | types, méthodes, traçabilité |

Points notables :

- **Rafraîchissement de jeton mutualisé** : plusieurs requêtes tombant en 401
  simultanément ne déclenchent qu'un seul rafraîchissement. Sans ce verrou, la
  rotation côté serveur invaliderait les suivants et la détection de rejeu
  déconnecterait l'utilisateur. Comportement couvert par des tests.
- **La clôture exige de saisir « CLOTURER »** : l'action est irréversible, un clic
  réflexe ne doit pas suffire. L'avertissement affiché provient de l'API, afin que
  web et mobile présentent exactement le même texte.
- **Surplus et manques** ne sont jamais distingués par la seule couleur : signe,
  icône et libellé portent la même information.
- **Bundle découpé par bibliothèque** : l'écran de connexion ne charge pas les
  403 ko de la bibliothèque de graphiques.

### Types du contrat d'API

```bash
pnpm api:dev                          # dans un terminal
pnpm --filter @inventair/web gen:api  # régénère src/api/schema.d.ts
```

Les types sont produits depuis `/api/v1/docs-json` de l'API **en fonctionnement** :
ils reflètent donc le code réellement déployé, pas un schéma figé.

## Application Android

Saisie terrain fonctionnant **hors réseau** : les comptages sont écrits sur le
terminal puis transmis dès le retour de la connexion.

```bash
cd apps/mobile
flutter pub get
dart run build_runner build          # génère le code de la base locale
flutter analyze && flutter test
flutter build apk --release --dart-define=API_BASE_URL=http://<IP>:3000/api/v1
```

L'adresse injectée au build n'est qu'une valeur par défaut : elle reste
**modifiable depuis l'écran de connexion**, sans reconstruire l'application.

Installation et détails de la chaîne d'outils : [apps/mobile/README.md](apps/mobile/README.md).

| Garantie | Mécanisme |
|---|---|
| Aucun comptage perdu | écriture locale SQLite avant toute tentative réseau |
| Aucun doublon | UUID v4 généré sur le terminal, idempotence côté serveur |
| Aucune suppression silencieuse | un refus serveur est conservé, affiché avec son motif |
| Travail visible | indicateur de synchronisation permanent dans la barre de titre |
| Déconnexion sûre | refusée tant que des comptages restent à transmettre |

## Déploiement

La procédure complète est dans [docs/deploiement.md](docs/deploiement.md).
En résumé, sur un serveur Linux muni de Docker :

```bash
cp .env.example .env          # puis remplacer toutes les valeurs CHANGEME
export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml

docker compose up -d --build postgres api web
set -a; . ./.env; set +a
./docker/nginx/init-letsencrypt.sh      # certificat TLS
docker compose up -d --build
```

La surcouche `docker-compose.prod.yml` retire tous les ports publiés sauf ceux
du reverse proxy : PostgreSQL, l'API et le frontend ne sont joignables que par
le réseau Docker privé. pgAdmin n'y est jamais démarré.

Un dump quotidien est produit dans le volume `backups`, avec purge au-delà de
`BACKUP_RETENTION_DAYS`. La restauration passe par
[`docker/backup/pg_restore.sh`](docker/backup/pg_restore.sh), qui sauvegarde
l'état courant avant d'écraser quoi que ce soit et exige une confirmation
explicite. **Copier les sauvegardes hors du serveur** : un volume Docker sur le
même disque ne protège de rien en cas de perte de la machine.

## Tests

```bash
pnpm api:test        # tests unitaires API (Jest)
pnpm api:test:e2e    # tests d'intégration API (Supertest)
pnpm api:smoke       # démarrage du binaire compilé + /health
pnpm web:test        # tests de l'interface web (Vitest)
pnpm web:build       # compilation de production

cd apps/mobile && flutter test   # logique hors ligne de l'application Android
```

L'intégration continue ([.github/workflows/ci.yml](.github/workflows/ci.yml))
exécute l'ensemble à chaque poussée, et produit l'APK en artefact.

Les tests d'intégration refusent de démarrer si `DATABASE_URL` ne contient pas
`test` : impossible de tronquer par mégarde une base de développement.

Le test de démarrage (`api:smoke`) lance réellement `node dist/main.js`. Il
existe parce que le module de test de Nest résout les modules autrement que Node :
une dépendance transitive non déclarée passe inaperçue en test et ne se révèle
qu'au lancement en production.

Si `samples/Stocks_14-06-2026.xlsx` est présent, la suite vérifie en plus
l'import complet du fichier réel : 7 961 lignes, somme théorique 100 598,09,
2 329 lignes sans emplacement, décimales préservées.

## Documentation

- [Méthodes de calcul d'inventaire](docs/methodes-calcul.md) — règles des méthodes 1
  et 2, calcul des écarts, clôture, campagne suivante.
- [Déploiement en production](docs/deploiement.md) — mise en service, TLS,
  exposition réseau, sauvegardes et restauration, exploitation courante.
- [Application Android](apps/mobile/README.md) — chaîne d'outils, compilation et
  vérification de l'APK, fonctionnement hors ligne.
- API : Swagger sur `/api/v1/docs` une fois l'API démarrée.
