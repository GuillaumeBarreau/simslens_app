# Contexte de build = RACINE du dépôt (cf. server/Dockerfile).
# Stage 1: build
FROM node:20-alpine AS build

ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_BASE_URL=/dashboard/

WORKDIR /repo

ENV NODE_OPTIONS="--max-old-space-size=1536"

COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/

RUN npm ci --no-audit --no-fund --include-workspace-root --workspace=app_dashboard

# tsconfig.base.json et tsconfig.web.json sont à la racine : app_dashboard/tsconfig.json
# en hérite, `npm run build` lance `tsc` et échoue sans eux.
COPY tsconfig.base.json tsconfig.web.json ./
COPY app_dashboard ./app_dashboard

WORKDIR /repo/app_dashboard

# Variables injectées au build par Vite
RUN echo "VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}" > .env && \
    echo "VITE_BASE_URL=${VITE_BASE_URL}" >> .env

RUN npm run build

# Stage 2: serve with nginx (même tag nginx:alpine que client et proxy)
FROM nginx:alpine AS production

COPY --from=build /repo/app_dashboard/dist /usr/share/nginx/html

RUN cat > /etc/nginx/conf.d/default.conf <<'NGINX_CONF'
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Static assets — long cache
    location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|webp|ttf|woff|woff2)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA fallback
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
