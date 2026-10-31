# SimsLens — guide de développement

> Complément du [README](../README.md) : l'installation et le démarrage rapide y sont
> décrits. Ce guide détaille la configuration (variables d'environnement, TypeScript),
> le lancement de chaque service, les commandes et le dépannage.

## ⚙️ Configuration

### Comment ça marche

Chaque workspace lit son **propre** `.env` (`app/.env`, `app_dashboard/.env`,
`server/.env`, `server_discord/.env`). Ces quatre fichiers ne s'écrivent pas à la
main : ils sont **générés** à partir d'un fichier racine par
[`scripts/env-manager.js`](../scripts/env-manager.js).

| Fichier racine | Contenu                      | Commande de propagation |
| -------------- | ---------------------------- | ----------------------- |
| `.env.local`   | Développement sur ta machine | `npm run env:local`     |
| `.env`         | Production / Docker          | `npm run env:init`      |

```bash
cp .env.example .env.local   # 1. créer et remplir
npm run env:local            # 2. propager vers les 4 workspaces
```

> ⚠️ Toute modification d'un `.env` racine nécessite de relancer `npm run env:local`
> (ou `env:init`), sinon les workspaces gardent l'ancienne valeur. À l'inverse,
> éditer `app/.env` & co. à la main est inutile : la prochaine propagation écrase.

> Ne commitez **jamais** `.env` ni `.env.local` — les deux sont dans `.gitignore`.

### Variables d'environnement

Les clés propagées vers chaque workspace sont déclarées dans l'objet `SERVICES` de
[`scripts/env-manager.js`](../scripts/env-manager.js) — c'est la source de vérité.

| Variable                     | Utilisé par             | Description                                                             |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                   | Serveur / Bot Discord   | `development` \| `production` \| `test`                                 |
| `PORT`                       | Serveur                 | Port de l'API (défaut `5000`)                                           |
| `CLIENT_URL`                 | Serveur / Bot Discord   | URL publique du frontend                                                |
| `SERVER_API_URL`             | Serveur / Bot Discord   | URL publique de l'API                                                   |
| `SESSION_SECRET`             | Serveur                 | Secret de session Express (`openssl rand -base64 32`)                   |
| `LOG_LEVEL`                  | Serveur                 | `error` \| `warn` \| `info` \| `debug` (défaut `info`)                  |
| `DATABASE_URL`               | Serveur                 | URL PostgreSQL                                                          |
| `REDIS_HOST` / `REDIS_PORT`  | Serveur                 | Redis pour la file BullMQ                                               |
| `BNET_ID`                    | Serveur                 | Client ID Blizzard API                                                  |
| `BNET_SECRET`                | Serveur                 | Client Secret Blizzard API                                              |
| `CLERK_PUBLISHABLE_KEY`      | Serveur                 | Clé publique Clerk pour vérifier les JWT                                |
| `ENABLE_DISCORD_BOT`         | Serveur                 | `true` pour activer l'intégration Discord                               |
| `DISCORD_BOT_TOKEN`          | Serveur / Bot Discord   | Token du bot Discord                                                    |
| `DISCORD_SERVER_URL`         | Serveur                 | URL du micro-service bot (`http://localhost:5001`)                      |
| `DISCORD_CLIENT_ID`          | Serveur                 | ID application Discord (OAuth)                                          |
| `DISCORD_CLIENT_SECRET`      | Serveur                 | Secret application Discord (OAuth)                                      |
| `VITE_API_BASE_URL`          | Build frontend (`app/`) | URL de base pour les appels API                                         |
| `VITE_WOW_EXTENSION`         | Build frontend (`app/`) | `The-War-Within` \| `Midnight`                                          |
| `VITE_CURRENT_SEASON`        | Build frontend (`app/`) | `The-War-Within` → `season-03`, `Midnight` → `season-01` \| `season-02` |
| `VITE_DISCORD_CLIENT_ID`     | Build frontend (`app/`) | `client_id` du bot, optionnel : vide, lien d'invitation masqué          |
| `VITE_CLERK_PUBLISHABLE_KEY` | Build dashboard         | Clé publique Clerk pour le frontend admin                               |
| `VITE_BASE_URL`              | Build dashboard         | Sous-chemin de déploiement (`/` en local)                               |

> `VITE_WOW_EXTENSION` et `VITE_CURRENT_SEASON` doivent former un couple valide de
> `EXTENSION_SEASONS` dans [`app/src/config/seasonConfig.ts`](../app/src/config/seasonConfig.ts).

**Variables optionnelles** (recopiées seulement si présentes) :

| Variable                      | Utilisé par   | Effet                                                           |
| ----------------------------- | ------------- | --------------------------------------------------------------- |
| `INIT_DATA_ON_START`          | Serveur       | `1` → seed la base au démarrage du conteneur                    |
| `REPORT_QUEUE_CONCURRENCY`    | Serveur       | Jobs de rapport en parallèle (défaut `3`)                       |
| `ENABLE_DISCORD_MOCK`         | Serveur       | Mock **actif par défaut** ; mettre `false` pour le vrai handler |
| `INCLUDE_STACK_IN_RESPONSES`  | Serveur       | `true` → stack trace dans les réponses d'erreur en production   |
| `DISCORD_CHANNEL_ID`          | Serveur / Bot | Salon par défaut des annonces                                   |
| `DISCORD_ANNOUNCE_CHANNEL_ID` | Bot Discord   | Salon des annonces d'événements (fallback `DISCORD_CHANNEL_ID`) |
| `DISCORD_RAID_CATEGORY_ID`    | Bot Discord   | Catégorie sous laquelle créer les salons de raid                |
| `INTERNAL_SERVER_URL`         | Bot Discord   | Prioritaire sur `SERVER_API_URL` (réseau Docker)                |

---

## 🧩 Configuration TypeScript

Les règles sont partagées, chaque workspace ne déclare que ce qui lui est propre.

```
tsconfig.base.json          # règles communes : strict, noUnused*, interop, casing
└── tsconfig.web.json       # + DOM, JSX, bundler, noEmit (Vite)
    ├── app/tsconfig.json           # + paths, types vitest
    ├── app_dashboard/tsconfig.json # + paths, types vitest
    └── companion/tsconfig.json
└── server/tsconfig.json    # + node16, rootDir/outDir (seul workspace qui émet)
    └── server/tsconfig.tools.json  # prisma.config.ts, vitest.config.ts
```

Les imports nus des fronts (`services/api`, `components/...`) résolvent depuis `src/`
via `"paths": { "*": ["./src/*"] }`. **Ne pas remplacer par `baseUrl`** : cette option
est dépréciée depuis TypeScript 6.0 et cesse de fonctionner en 7.0. Côté bundler c'est
`vite-tsconfig-paths` qui lit ce mapping.

Toute règle valable partout va dans `tsconfig.base.json` — ne la recopiez pas dans
un workspace. Le `vite.config.ts` de chaque front est inclus dans son projet, donc
typé avec les mêmes règles que le reste du code.

`server` est le seul à compiler vers `dist/`, d'où `rootDir: "src"`. Ses fichiers de
configuration vivent à la racine du workspace, donc hors de `rootDir` : ils ont leur
propre projet [`tsconfig.tools.json`](../server/tsconfig.tools.json), qui n'émet rien.

---

## 🎯 Lancement local

### 1. Propager la configuration vers les workspaces

```bash
npm run env:local
```

### 2. Démarrer les services Docker (PostgreSQL + Redis)

```bash
docker compose -f docker-compose.local.yml up -d
```

PostgreSQL est publié sur **5433** (utilisateur et mot de passe `postgres`) et Redis
sur **6380** : ce sont les valeurs de la `DATABASE_URL` de `.env.example`.

### 3. Initialiser la base de données

```bash
cd server
npx prisma generate
npx prisma migrate deploy
cd ..

npm run server:init-data   # seed : classes, spés, royaumes, arbres de talents
```

Pour disposer d'une guilde de test complète (personnages, événements, wishlists),
enchaînez avec `npm run server:init-fake-data` — voir
[docs/database/index.md](database/index.md#-données-de-test-fake-data).

### 4. Lancer toutes les applications

```bash
npm run dev
```

| Application     | URL                   |
| --------------- | --------------------- |
| Frontend        | http://localhost:5173 |
| Dashboard admin | http://localhost:3001 |
| Backend API     | http://localhost:5000 |
| Bot Discord     | port 5001             |

### En cas de problème au démarrage

| Symptôme                                               | Cause / correction                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Failed to load native binding` (`@swc/core`) sur Vite | `node_modules` corrompu → `npm ci` puis `npm run prisma:generate`                  |
| `does not provide an export named …` (discord.js)      | Dépendance transitive manquante, même correction : `npm ci`                        |
| `# VAR=MISSING_IN_SOURCE` dans un `.env` de workspace  | La variable manque dans `.env.local` → l'ajouter puis relancer `npm run env:local` |
| `ECONNREFUSED` sur PostgreSQL / Redis                  | Conteneurs éteints → `docker compose -f docker-compose.local.yml up -d`            |

---

## 🛡 Dashboard Admin (`app_dashboard/`)

Interface d'administration protégée par [Clerk](https://clerk.com).

| Environnement | URL                             |
| ------------- | ------------------------------- |
| Local         | http://localhost:3001           |
| Production    | https://simslens.com/dashboard/ |

**Fonctionnalités :**

- **Dashboard** : stats globales (personnages actifs, guildes, ilvl moyen, répartition tanks/healers/dps), distribution par classe
- **Guildes** : liste de toutes les guildes avec le nombre de personnages, expandable pour voir les personnages avec leur classe, spé, rôle, ilvl et statut

**Architecture :**

- Toutes les requêtes passent uniquement par `/admin` (protégé par JWT Clerk)
- Dev : Vite proxy `/admin` → `http://localhost:5000`
- Prod : nginx route `/admin/` → container `server`

---

## 🛠 Commandes Utiles

### Développement

```bash
npm run dev              # Démarrer toutes les applications (Frontend, Dashboard, Backend, Discord)
npm run dev:app          # Frontend uniquement (port 5173)
npm run dev:dashboard    # Dashboard admin uniquement (port 3001)
npm run dev:server       # Backend uniquement (port 5000)
npm run dev:discord      # Bot Discord uniquement
```

### Environnement

```bash
npm run env:local        # Propage .env.local  -> app, app_dashboard, server, server_discord
npm run env:init         # Propage .env (prod) -> idem
```

### Documentation générée

Deux documents sont dérivés du code et **ne doivent pas être édités à la main** :

```bash
npm run docs             # régénère les deux
npm run docs:api         # docs/api/reference.md   <- app.js + */*.routes.*
npm run docs:db          # docs/database/schema.md <- prisma/schema.prisma
```

À relancer après toute modification de routes ou du schéma Prisma.

### Base de données

Raccourcis depuis la racine (équivalents aux commandes `npx prisma` dans `server/`) :

```bash
npm run prisma:studio            # Interface graphique
npm run prisma:migrate           # Créer une migration (migrate dev)
npm run prisma:migrate:deploy    # Appliquer les migrations (production)
npm run prisma:generate          # Générer le client Prisma
npm run server:init-data         # Seed des données de référence (classes, spés, items, talents)
npm run server:init-fake-data    # ⚠️ Seed de test : purge 6 tables — jamais en production
npm run db:reset                 # ⚠️ reset complet + generate + seed
```

### Docker (local)

```bash
docker-compose -f docker-compose.local.yml up -d      # Démarrer
docker-compose -f docker-compose.local.yml down       # Arrêter
docker-compose -f docker-compose.local.yml logs -f    # Voir les logs
```

### Docker (production) — Déploiement complet

```bash
./deployment/deploy.sh production
```

### Docker (production) — Rebuild d'un container individuel

```bash
# Frontend client
docker compose --env-file .env build --no-cache client && docker compose --env-file .env up -d client

# Dashboard admin
docker compose --env-file .env build --no-cache dashboard && docker compose --env-file .env up -d dashboard

# Serveur API
docker compose --env-file .env build --no-cache server && docker compose --env-file .env up -d server

# Bot Discord
docker compose --env-file .env build --no-cache discord && docker compose --env-file .env up -d discord

# Nginx (rechargement config)
docker compose --env-file .env up -d --force-recreate nginx
```

### Qualité du code

```bash
npm run lint         # Vérifier le code
npm run lint:fix     # Corriger automatiquement
npm run format:fix   # Formater avec Prettier
```

---

## 🔧 Configuration des Ports

| Service         | Port local | Port Docker interne |
| --------------- | ---------- | ------------------- |
| Frontend        | 5173       | 80                  |
| Dashboard admin | 3001       | 80                  |
| Backend API     | 5000       | 5000                |
| Bot Discord     | 5001       | 5001                |
| PostgreSQL      | 5433       | 5432                |
| Redis           | 6380       | 6379                |

---

## 🐛 Dépannage

### Erreur `crypto.hash is not a function`

Vous utilisez Node.js 18 ou inférieur. **Mettez à jour vers Node.js 20+**

### Erreur de connexion PostgreSQL

```bash
docker ps  # Vérifier que le container postgres tourne
```

### Erreur Clerk `Missing publishableKey` sur le dashboard

La variable `VITE_CLERK_PUBLISHABLE_KEY` n'était pas définie au moment du build. Rebuilder le container :

```bash
docker compose --env-file .env build --no-cache dashboard && docker compose --env-file .env up -d dashboard
```

### Les migrations Prisma échouent

```bash
cd server
npx prisma migrate reset   # Reset complet (perd les données !)
```

---
