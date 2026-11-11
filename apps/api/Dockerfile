# syntax=docker/dockerfile:1.7
# ------------------------------------------------------------------------------
# Image de l'API InventAir — build multi-étapes.
# Le contexte de build est la RACINE du monorepo (cf. docker-compose.yml).
#
# Base Debian slim plutôt qu'Alpine : argon2 (module natif) et les moteurs Prisma
# disposent de binaires précompilés pour glibc, ce qui évite une compilation
# node-gyp dans l'image.
# ------------------------------------------------------------------------------

ARG NODE_VERSION=22-bookworm-slim

# ---------- Base commune -------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- Dépendances --------------------------------------------------------
# Couche mise en cache tant que les manifestes ne changent pas.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @inventair/api...

# ---------- Développement (hot reload) -----------------------------------------
FROM deps AS development
ENV NODE_ENV=development
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm exec prisma generate
EXPOSE 3000
CMD ["pnpm", "start:dev"]

# ---------- Compilation --------------------------------------------------------
FROM deps AS builder
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN pnpm exec prisma generate \
 && pnpm exec nest build

# Élague l'arbre de dépendances pour ne garder que la production.
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @inventair/api... \
 && pnpm --filter @inventair/api exec prisma generate

# ---------- Image finale -------------------------------------------------------
FROM base AS production
ENV NODE_ENV=production

# L'API ne tourne jamais en root.
RUN groupadd --system --gid 1001 inventair \
 && useradd --system --uid 1001 --gid inventair inventair

WORKDIR /app/apps/api

COPY --from=builder --chown=inventair:inventair /app/node_modules /app/node_modules
COPY --from=builder --chown=inventair:inventair /app/apps/api/node_modules ./node_modules
COPY --from=builder --chown=inventair:inventair /app/apps/api/dist ./dist
COPY --from=builder --chown=inventair:inventair /app/apps/api/prisma ./prisma
COPY --from=builder --chown=inventair:inventair /app/apps/api/package.json ./package.json
COPY --chown=inventair:inventair docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

# Volumes montés en production (fichiers importés et rapports générés).
RUN mkdir -p /app/storage/uploads /app/storage/reports \
 && chown -R inventair:inventair /app/storage

USER inventair
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/v1/health || exit 1

ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "dist/main.js"]
