# Contexte de build = RACINE du dépôt (cf. server/Dockerfile).
FROM node:20-alpine

WORKDIR /repo

# Les package.json de tous les workspaces sont requis : `npm ci` valide le
# lockfile contre l'arbre complet.
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/

RUN npm ci --omit=dev --no-audit --no-fund --include-workspace-root --workspace=server_discord && \
    npm cache clean --force

COPY server_discord/src ./server_discord/src

WORKDIR /repo/server_discord

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"

EXPOSE 5001

CMD ["node", "src/Base/app.js"]
