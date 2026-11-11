# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------------------
# Image du frontend InventAir — build multi-étapes.
# Le contexte de build est la RACINE du monorepo.
#
# Résultat : des fichiers statiques servis par nginx. Aucun Node à l'exécution.
# ------------------------------------------------------------------------------

ARG NODE_VERSION=22-bookworm-slim

# ---------- Dépendances --------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @inventair/web...

# ---------- Compilation --------------------------------------------------------
FROM deps AS builder

# Laissée VIDE par défaut : le client retombe alors sur « /api/v1 », c'est-à-dire
# la même origine que la page. C'est le montage de production, où nginx sert le
# frontend et relaie l'API — pas de CORS, pas d'adresse figée dans le bundle.
# Ne renseigner cet argument que si l'API vit sur un autre domaine.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY apps/web ./apps/web
WORKDIR /app/apps/web
RUN pnpm exec vite build

# ---------- Image finale -------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Configuration du serveur statique : fallback SPA et cache des actifs hachés.
COPY docker/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
