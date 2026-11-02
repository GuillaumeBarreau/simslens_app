# 🐳 Déploiement Docker

> Deux variantes : **Docker Compose seul** (`docker-compose.yml`, Nginx gère HTTPS avec des
> certificats Certbot), décrit ci-dessous, ou **derrière une plateforme qui gère HTTPS**
> (Dokploy, Coolify, Traefik…) : voir
> [Déployer derrière Traefik](#-déployer-derrière-traefik-dokploy-coolify).

> **Pour votre propre instance,** remplacez le domaine `simslens.com` par le vôtre (variables
> `CLIENT_URL`, `VITE_API_BASE_URL`, configuration Nginx…) et utilisez vos propres
> identifiants. Pour développer en local, suivez plutôt le
> [démarrage rapide](../README.md#quickstart) ou le
> [guide de développement](development.fr.md).

Ce projet utilise Docker et Docker Compose pour faciliter le déploiement en production.

## 📋 Prérequis

- Docker installé ([Installation Docker](https://docs.docker.com/get-docker/))
- Docker Compose installé ([Installation Docker Compose](https://docs.docker.com/compose/install/))
- Fichier `.env` configuré à la racine du projet

## 🚀 Commandes de déploiement

### Premier déploiement

```bash
# 1. Build et démarrage des conteneurs
docker-compose up -d --build

# 2. Initialiser les données (une seule fois)
docker-compose run --rm server node ./dist/scripts/initData.js
```

### Mise à jour de l'application

```bash
# Rebuild et redémarrage
docker-compose down
docker-compose up -d --build
```

### Gestion des conteneurs

```bash
# Voir les logs
docker-compose logs -f server
docker-compose logs -f client

# Arrêter les conteneurs
docker-compose down

# Redémarrer un service
docker-compose restart server

# Voir l'état des conteneurs
docker-compose ps
```

## 🗄️ Gestion de la base de données

### Migrations automatiques

Les migrations Prisma sont **appliquées automatiquement** au démarrage du conteneur grâce au script `docker-entrypoint.sh`.

### Initialisation des données

**Option 1 : Manuelle (recommandée)**

```bash
docker-compose run --rm server node ./dist/scripts/initData.js
```

**Option 2 : Automatique au démarrage**

```bash
# Dans votre fichier .env
INIT_DATA_ON_START=1

# Puis redémarrer
docker-compose restart server
```

⚠️ **Attention** : L'option automatique réinitialise les données à chaque redémarrage !

### Accès à la base de données

```bash
# Ouvrir un shell dans le conteneur
docker-compose exec server sh

# Accéder à Prisma Studio (interface graphique)
docker-compose exec server npx prisma studio
```

### Sauvegarder la base de données

```bash
docker compose exec -T postgres pg_dump -U postgres droptimizer > ./backup-$(date +%Y%m%d).sql
```

### Restaurer une sauvegarde

```bash
# Arrêter le serveur pour éviter les écritures concurrentes
docker compose stop server

docker compose exec -T postgres psql -U postgres -d droptimizer < ./backup-20251226.sql

docker compose start server
```

## 🔧 Résolution de problèmes

### Le serveur ne démarre pas

```bash
# Voir les logs détaillés
docker-compose logs server

# Vérifier que les migrations sont appliquées
docker-compose exec server npx prisma migrate status
```

### Erreur "table does not exist"

```bash
# Forcer l'application des migrations
docker-compose exec server npx prisma migrate deploy
```

### Réinitialiser complètement la base de données

```bash
# ⚠️ ATTENTION : Supprime toutes les données !
docker-compose down -v  # -v supprime les volumes
docker-compose up -d --build
docker-compose run --rm server node ./dist/scripts/initData.js
```

## 📦 Architecture Docker

**Services :**

- `nginx` : Reverse proxy (ports 80 / 443)
- `server` : Backend Node.js (port 5000)
- `client` : Frontend React/Vite servi en statique
- `dashboard` : Dashboard admin, monté sous `/dashboard/`
- `discord` : Bot Discord (port 5001)
- `postgres` : PostgreSQL 15 (publié sur `127.0.0.1:5433`)
- `redis` : Redis 7 pour la file BullMQ (publié sur `127.0.0.1:6380`)

**Volumes :**

- `droptimizer-pg-data` : Données PostgreSQL persistantes
- `redis_data` : Persistance Redis

**Fichiers clés :**

- `docker-compose.yml` : Configuration des services de production
- `docker-compose.local.yml` : PostgreSQL + Redis seuls, pour le dev local
- `server/Dockerfile` : Build du backend
- `server/docker-entrypoint.sh` : Script d'initialisation (migrations + seed optionnel)
- `app/Dockerfile` / `app_dashboard/Dockerfile` : Build des frontends
- `.dockerignore` : **critique** — le contexte étant la racine, c'est lui seul qui
  évite d'envoyer tout le dépôt au démon Docker
- `docker-compose.dokploy.yml` + `deployment/nginx/nginx.dokploy.conf` : variante derrière un
  proxy qui gère HTTPS (section suivante)

## 🧭 Déployer derrière Traefik (Dokploy, Coolify…)

Quand une plateforme termine elle-même HTTPS et route les domaines (Dokploy, Coolify, un
Traefik existant…), utiliser `docker-compose.dokploy.yml`. Par rapport à `docker-compose.yml` :

- `nginx` ne publie aucun port (`expose: 80`) et ne monte pas `/etc/letsencrypt` ; Postgres et
  Redis ne sont pas publiés non plus ;
- sa configuration, [`nginx.dokploy.conf`](../deployment/nginx/nginx.dokploy.conf), écoute en
  HTTP, reprend l'IP réelle et `X-Forwarded-Proto` du proxy (réseaux privés uniquement) et
  redirige `www` vers le domaine principal.

**Nginx reste devant les services** : il route par chemin (`/1/`, `/auth/`, `/admin/`,
`/health` → `server`, `/dashboard/` → `dashboard`, le reste → `client`), ajoute les en-têtes de
sécurité et la compression. Il joint les conteneurs par leur nom via le DNS de Docker, résolu à
chaque requête : un redéploiement qui leur donne de nouvelles IP ne demande pas de relancer
`nginx`. Côté plateforme, le domaine pointe donc vers le service `nginx`,
port 80, HTTPS activé.

Points d'attention :

- **Domaine** : `simslens.com` est écrit dans `nginx.dokploy.conf` (`server_name`, redirection
  `www`) : le remplacer par le vôtre.
- **Réseau `simslens-net`** : le compose y rattache `nginx` pour joindre un conteneur
  optionnel `simslens-landing` (page vitrine, hors de ce dépôt). Le réseau est déclaré
  `external` : le créer avant le premier déploiement, même sans vitrine
  (`docker network create simslens-net`). Sans vitrine, Nginx sert l'application sur `/`.
- **Variables** : les mêmes que pour `docker-compose.yml`. `CLIENT_URL` doit commencer par
  `https://`, sinon le cookie de session n'est pas `Secure` ; définir `DB_PASSWORD`
  explicitement.
- **Dokploy** : service de type Compose, chemin `./docker-compose.dokploy.yml`. Un service
  Compose n'applique ses domaines qu'au déploiement : redéployer après en avoir ajouté un.
  L'installeur de Dokploy expose aussi son panneau (port 3000) et les ports de Docker Swarm
  (2377, 7946, 4789) sur l'adresse publique : les filtrer, en IPv4 **et** en IPv6. `ufw` ne
  suffit pas, Docker contourne ses règles.
- **Migrer une instance existante** : le nom des volumes dépend du nom de projet Compose, que la
  plateforme choisit. Restaurer un `pg_dump` dans les nouveaux volumes **avant** le premier
  démarrage du `server`, qui applique les migrations Prisma dès qu'il démarre (voir
  [Restaurer une sauvegarde](#restaurer-une-sauvegarde)).

## 📌 Contexte de build : la racine du dépôt

Les 4 images se construisent avec **`context: .`** (la racine), jamais depuis leur
propre dossier :

```yaml
build:
  context: .
  dockerfile: ./server/Dockerfile
```

C'est imposé par deux fichiers qui vivent à la racine et sont indispensables au build :

| Fichier                                    | Pourquoi                                       |
| ------------------------------------------ | ---------------------------------------------- |
| `package-lock.json`                        | unique pour tout le monorepo (npm workspaces)  |
| `tsconfig.base.json` / `tsconfig.web.json` | dont les tsconfig de chaque workspace héritent |

Chaque Dockerfile copie donc les `package.json` de **tous** les workspaces avant
d'installer : `npm ci` valide le lockfile contre l'arbre complet et échoue s'il en
manque un.

```dockerfile
COPY package.json package-lock.json ./
COPY app/package.json ./app/
COPY app_dashboard/package.json ./app_dashboard/
COPY server/package.json ./server/
COPY server_discord/package.json ./server_discord/
RUN npm ci --include-workspace-root --workspace=server
```

> ⚠️ `npm ci` et non `npm install`, **sans fallback** : une image doit installer
> exactement les versions du lockfile, ou échouer bruyamment. Un `|| npm install`
> rendrait les builds non reproductibles sans que personne ne s'en aperçoive.

## 🔐 Variables d'environnement importantes

Liste complète et rôle de chaque variable : voir la section Configuration du
[guide de développement](development.fr.md#️-configuration). Les valeurs ci-dessous sont celles que
`docker-compose.yml` **impose lui-même**, quelles que soient celles du `.env` :

| Variable                    | Valeur imposée par docker-compose                        |
| --------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`              | `postgresql://…@postgres:5432/droptimizer?schema=public` |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` (réseau interne Docker)                 |
| `INIT_DATA_ON_START`        | `0` — initialisation manuelle en production              |
| `VITE_BASE_URL` (dashboard) | `/dashboard/`                                            |

Les autres (`NODE_ENV`, `BNET_ID`, `BNET_SECRET`, `CLIENT_URL`, `SERVER_API_URL`,
`SESSION_SECRET`, `CLERK_PUBLISHABLE_KEY`, `DISCORD_*`, `VITE_*`) sont lues depuis
le `.env` à la racine.

## 💡 Bonnes pratiques

1. **Ne jamais utiliser `-v` avec `docker-compose down`** sauf si vous voulez supprimer les données
2. **Toujours sauvegarder la DB** avant une mise à jour majeure
3. **Utiliser `INIT_DATA_ON_START=0`** en production (initialisation manuelle) — mais
   une base neuve doit être seedée une fois, sinon `classes` et `specializations`
   restent vides (voir « Données de référence obligatoires » dans [`database/index.md`](database/index.md))
4. **Vérifier les logs** après chaque déploiement, notamment l'avertissement
   `[ReferenceData]` qui signale des tables de référence vides
5. **Tester les migrations** en local avant de déployer

## 🔑 Secrets dans les URL : flux iCal

Le flux iCal d'un joueur (`GET /1/events/calendar-feed/<jeton>.ics`, SIMS-204) est
lu par un agenda, sans session : **le jeton de l'URL est le seul secret**. Quiconque
lit l'URL lit les soirées et le statut d'inscription du joueur.

- **Dans l'API** : la route remplace le jeton par `[jeton-masqué]` dans
  `req.originalUrl` avant toute validation. Le journal HTTP (`morgan`) et
  `errorHandler` n'écrivent donc pas le jeton (testé dans
  `server/src/api/calendar_feed/__tests__/calendarFeedRoutes.test.ts`). Seule
  exception : une URL qui ne correspond pas à la route (segment en trop après le
  jeton) est journalisée telle quelle par le 404 générique.
- **Hors de l'API** : un reverse proxy, un CDN ou un hébergeur qui journalise les
  accès écrit l'URL complète, jeton compris. Si ces journaux sont conservés ou
  partagés, y masquer le chemin `/1/events/calendar-feed/…` ou en réduire la
  rétention.
- **En cas de fuite** : le joueur régénère ou révoque son lien depuis « Mon
  activité » ; l'ancienne URL répond aussitôt 404. Seule l'empreinte SHA-256 du
  jeton est stockée en base (`calendar_feed_tokens.tokenHash`).

## 🔗 Ressources

- [Documentation Docker](https://docs.docker.com/)
- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation Prisma](https://www.prisma.io/docs)
