# Contexte de build = RACINE du dépôt, pas server/.
# C'est la seule façon d'atteindre package-lock.json, unique et à la racine
# (npm workspaces), et tsconfig.base.json dont server/tsconfig.json hérite.

FROM node:20-alpine AS build

WORKDIR /repo

# Plafonne la RAM de tsc / Prisma pendant le build sur le VPS
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Manifestes d'abord, pour que la couche d'install soit mise en cache tant que
# les dépendances ne changent pas.
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/

RUN npm ci --no-audit --no-fund --include-workspace-root --workspace=server

# Client Prisma (généré directement sur node:20-alpine pour correspondre au runtime)
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/prisma.config.ts
WORKDIR /repo/server
RUN DATABASE_URL="postgresql://postgres:password@localhost:5432/droptimizer" npx prisma generate

# Sources et compilation TypeScript
WORKDIR /repo
COPY tsconfig.base.json ./tsconfig.base.json
COPY server/tsconfig.json server/tsconfig.tools.json ./server/
COPY server/src ./server/src
WORKDIR /repo/server
RUN npm run build

# tsc ne recopie que les .ts compilés : on complète dist/ avec les fichiers
# qu'il ignore (entrée `www` sans extension, .js déjà écrits, JSON, données).
RUN if [ -f ./src/www ]; then cp ./src/www ./dist/www || true; fi && \
    find ./src -maxdepth 1 -name "*.js" -exec cp {} ./dist/ \; && \
    if [ -d ./src/api ]; then cd src && find api -name "*.js" -exec sh -c 'mkdir -p /repo/server/dist/$(dirname "$1") && cp "$1" /repo/server/dist/"$1"' _ {} \; ; fi && \
    if [ -d ./src/scripts ]; then cp -r ./src/scripts/. ./dist/scripts/ || true; fi && \
    if [ -d ./src/data ]; then cp -r ./src/data ./dist/data || true; fi && \
    cp -r ./src/shared ./dist/ || true

# ---------------------------------------------------------------------------

FROM node:20-alpine AS runtime
WORKDIR /app

# Dépendances de production uniquement + suppression des paquets de build/test
# présents dans dependencies et nettoyage du cache npm dans la même couche
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/
RUN npm ci --omit=dev --no-audit --no-fund --include-workspace-root --workspace=server && \
    rm -rf node_modules/vite node_modules/happy-dom node_modules/rollup node_modules/@esbuild node_modules/@types/express && \
    npm cache clean --force

# Le serveur s'exécute depuis /app, où l'entrypoint attend prisma/ et dist/
COPY --from=build /repo/server/dist ./dist
COPY --from=build /repo/server/prisma ./prisma
COPY --from=build /repo/server/prisma.config.ts ./prisma.config.ts
COPY --from=build /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/node_modules/@prisma/client ./node_modules/@prisma/client

COPY server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5000

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=768"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "./dist/www"]
