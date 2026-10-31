# Contexte de build = RACINE du dépôt (cf. server/Dockerfile).
# Stage 1: build
FROM node:20-alpine AS build

# Doivent correspondre à build.args dans docker-compose.yml
ARG VITE_API_BASE_URL
ARG VITE_WOW_EXTENSION
ARG VITE_CURRENT_SEASON
# Optionnel : vide, le lien d'invitation du bot est masqué.
ARG VITE_DISCORD_CLIENT_ID

WORKDIR /repo

# Plafonne la RAM de tsc / Vite pendant le build
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/

RUN npm ci --no-audit --no-fund --include-workspace-root --workspace=app

# tsconfig.base.json et tsconfig.web.json sont à la racine : app/tsconfig.json
# en hérite, `npm run build` lance `tsc` et échoue sans eux.
COPY tsconfig.base.json tsconfig.web.json ./
COPY app ./app

WORKDIR /repo/app

# Les variables viennent uniquement des build-args. Les .env* sont exclus par
# .dockerignore : un .env.local de développement ne doit jamais se retrouver
# dans une image de production.
RUN : > .env.local && \
    if [ -n "$VITE_API_BASE_URL" ]; then printf 'VITE_API_BASE_URL=%s\n' "$VITE_API_BASE_URL" >> .env.local; fi && \
    if [ -n "$VITE_WOW_EXTENSION" ]; then printf 'VITE_WOW_EXTENSION=%s\n' "$VITE_WOW_EXTENSION" >> .env.local; fi && \
    if [ -n "$VITE_CURRENT_SEASON" ]; then printf 'VITE_CURRENT_SEASON=%s\n' "$VITE_CURRENT_SEASON" >> .env.local; fi && \
    if [ -n "$VITE_DISCORD_CLIENT_ID" ]; then printf 'VITE_DISCORD_CLIENT_ID=%s\n' "$VITE_DISCORD_CLIENT_ID" >> .env.local; fi

RUN npm run build

# Stage 2: serve with nginx (même tag nginx:alpine que le proxy pour mutualiser l'image)
FROM nginx:alpine AS production
COPY --from=build /repo/app/dist /usr/share/nginx/html

RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX_CONF'
server {
	listen       80;
	server_name  localhost;

	root /usr/share/nginx/html;
	index index.html;

	gzip on;
	gzip_min_length 1024;
	gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

	# Serve static assets with long cache
	location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|webp|ttf|woff|woff2)$ {
		try_files $uri =404;
		access_log off;
		add_header Cache-Control "public, max-age=31536000, immutable";
	}

	# HTML files should not be cached
	location / {
		try_files $uri $uri/ /index.html;
		add_header Cache-Control "no-cache";
	}

	access_log off;
	error_log /dev/stderr warn;
}
NGINX_CONF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
