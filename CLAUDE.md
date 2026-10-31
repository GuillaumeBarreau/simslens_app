# CLAUDE.md

Contexte et règles pour Claude sur ce dépôt. Ce fichier **renvoie** vers la doc ; il ne
la recopie pas. En cas de doute, la doc liée fait foi.

## Le produit

**SimsLens** : gestion et optimisation du loot pour les guildes World of Warcraft.
(« Droptimizer » désigne le type de simulation Raidbots que l'app importe, pas le produit.)
Utilisateurs : joueurs (wishlists, inscriptions, suivi de leur personnage) et officiers
(roster, compositions de raid, attribution du loot, présences, calendrier).
Connexion Battle.net ; inscriptions aux raids aussi via un bot Discord.

**Le vote de loot se fait en jeu, dans l'addon (RCLootCouncil)**, pas dans l'application :
l'app compagnon (`companion/`) lit les données de l'addon et les importe (`sync_loot`).
Ne pas proposer de vote ni d'« écran de vote » dans l'app ; exploiter les données
importées.

## Le monorepo

| Dossier           | Rôle                                       | Stack                                                       |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `app/`            | Front joueurs / officiers                  | React, Vite, Mantine 8, TanStack Query, i18next (`fr`/`en`) |
| `app_dashboard/`  | Back-office                                | React, Vite, Clerk                                          |
| `server/`         | API + jobs                                 | Express 5, Prisma 7 / PostgreSQL, Redis, BullMQ, Joi        |
| `server_discord/` | Bot Discord des joueurs                    | discord.js 14                                               |
| `companion/`      | App desktop                                | Tauri — **hors** workspaces npm                             |
| `scripts/`        | Outillage (env, docs, permissions, agents) | Node, sans dépendance                                       |

## Commandes

```bash
npm run dev                  # tout lancer (après docker compose -f docker-compose.local.yml up -d)
npm run lint                 # ⚠️ échoue aujourd'hui (≈430 problèmes hérités) — voir « Qualité »
npm run format               # Prettier --check
cd app && npm run typecheck  # tsc --noEmit
cd server && npx tsc --noEmit
cd app && npx vitest run     # tests ; idem dans app_dashboard
npm run docs                 # régénère docs/api/reference.md et docs/database/schema.md
npm run sync:permissions     # recopie les permissions serveur vers app/
npm run deadcode             # knip sur app/
npm run verify               # vérification complète de la branche (= /verify, alias agents:verify) — à passer avant une PR
npm run agents:tickets       # instantané des issues GitHub → .claude/docs/TICKETS.md
npm run agents:test          # tests des garde-fous des agents
npm run agents:cycle         # étapes 1-2 : observer et créer les issues ⏳ agent:pending (--dry-run pour voir)
npm run agents:develop       # étape 3 : fermer les ❌ agent:rejected, développer les ✅ agent:approved (--dry-run)
npm run agents:watch         # suit le cycle en cours depuis un autre terminal
```

Skills : `/verify`, `/audit <zone>`, `/scout <thème>`, `/implement-issue <n°>`,
`/review-pr <n°>`, `/cycle`. Un hook (`scripts/agents/guard.mjs`) bloque dans toute
session les commandes irréversibles (reset de base, push forcé, déploiement, release).

Installation et `.env` : [`README.md`](README.md). Les `.env` des workspaces sont
**générés** par `scripts/env-manager.js` : ne jamais les éditer à la main.

## Conventions

| Sujet                                 | Référence                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Index de toute la doc                 | [`docs/README.md`](docs/README.md)                                                                          |
| Architecture API (migration en cours) | [`docs/api/architecture.md`](docs/api/architecture.md)                                                      |
| Ajouter un module API                 | [`docs/api/routes.md`](docs/api/routes.md) — pattern cible `usecases/` + `.ts`, `character` comme référence |
| Middlewares, auth, `checkPermission`  | [`docs/api/context.md`](docs/api/context.md)                                                                |
| Validation, erreurs, codes HTTP       | [`docs/api/validation-errors.md`](docs/api/validation-errors.md)                                            |
| Base de données, migrations           | [`docs/database/conventions.md`](docs/database/conventions.md)                                              |
| Appels API côté front                 | [`docs/frontend/data-fetching.md`](docs/frontend/data-fetching.md)                                          |
| Formulaires                           | [`docs/frontend/forms.md`](docs/frontend/forms.md)                                                          |
| Design system front                   | `app/src/components/design-system/README.md`                                                                |
| Rôles et permissions                  | [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md)                                                                |

À retenir :

- **Nouveau module API** : pattern cible uniquement. Ne pas étendre un `.service.js`
  historique pour y ajouter une fonctionnalité nouvelle.
- **Front** : composant → hook `hooks/queries` → service → `apiClient`. Pas de
  `useEffect` pour charger des données.
- **Textes affichés** : via i18next, clés dans `app/src/locales/fr` **et**
  `app/src/locales/en`.
- **Fonctionnalité visible pas encore prête** : la masquer avec
  `FEATURES_IN_DEVELOPMENT` + `<FeatureGuard>` (`app/src/config/featureFlags.ts`).
- **Langue** : doc, issues, PR et messages en français ; code et identifiants en anglais.
  Exception : le `README.md` racine et les fichiers communautaires (`CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, modèles d'issues et de PR) sont en anglais.
- **Docs générées** (`docs/api/reference.md`, `docs/database/schema.md`) : ne pas les
  éditer, relancer `npm run docs`.

## Zones sensibles

Ne pas modifier sans demande explicite, et toujours le signaler :

- `server/prisma/**` (schéma, migrations) — jamais de `migrate reset` ni `db push`.
- Authentification, sessions, permissions : `server/src/api/auth/`,
  `server/src/api/device_auth/`, `server/src/middleware/`,
  `server/src/shared/config/permissions/`.
- `.github/`, Dockerfiles, `docker-compose*.yml`, `deployment/`.
- `.env*` et `scripts/env-manager.js` — ne pas lire ni afficher les `.env`.
- Dépendances (`package.json`, lockfile).
- **La production** : ne jamais déployer, créer de tag `v*`, ni toucher à une ressource
  de prod. Le mainteneur valide et déploie lui-même.

## Qualité : l'état réel

- `npm run lint` et `npm run format` échouent sur du code hérité. Règle : **les fichiers
  que tu modifies doivent passer lint et Prettier**, et le total ne doit pas augmenter.
- Tests : `server` ≈ 50 fichiers / 675 tests (Vitest), `app` 3 fichiers, `app_dashboard`
  6 tests, tous au vert. Tout changement de logique s'accompagne de tests.
- Deux tests protègent l'API : `server/src/__tests__/routeGuards.test.ts` (toute route a
  un garde ou une exception motivée dans `routeGuards.exceptions.ts`) et
  `routesLoad.test.ts` (chaque fichier de routes se charge comme au démarrage).
- Un `module.exports = { … }` explicite remplace tous les exports d'un fichier : tout
  handler doit y figurer (cause de SIMS-130).
- Ne jamais supprimer, désactiver (`.skip`) ni affaiblir un test pour faire passer une
  vérification.
- CI sur chaque PR : `ci.yml` (builds Docker), `quality.yml` (`verify.mjs` + tests des
  garde-fous), `pr-conventions.yml` (branche, titre, labels).

## Suivi du travail

- **Source de vérité : les issues GitHub.** Les objectifs du moment sont des
  **milestones** ; l'état de tous les tickets se lit dans `.claude/docs/TICKETS.md`
  (généré, local : lancer `npm run agents:tickets` pour le rafraîchir).
- **Une issue = une branche = une PR**, reliées par le numéro de l'issue sur 3 chiffres
  (`#71` → `SIMS-071`) :
  - branche : **`feat/SIMS-071`**, exactement — pas de suffixe, quel que soit le type ;
  - titre de PR (et d'issue) : `SIMS-071 : [<Type>] <Titre>`, ex.
    `SIMS-071 : [Feature] Détection visuelle et alerte de conflits d'assignation multiple` ;
  - corps de PR : `Closes #71` ;
  - labels : un type, au moins un périmètre (`backend`, `frontend`, …), une priorité.

  Contrôlé par la CI (« Conventions », `scripts/agents/pr-check.mjs`) ; règles dans
  `scripts/agents/naming.mjs`. Pas d'issue → en créer une avant la branche.

- **Dette connue** : [`docs/TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md). Un point
  « ⏸ Reporté » est une décision : ne pas le re-signaler ni le corriger.
- **Idées des agents** : issues ⏳ `agent:pending`. Le mainteneur pose ✅ `agent:approved`
  ou ❌ `agent:rejected` ; `npm run agents:develop` (étape 3) les traite.
- **Système d'agents** : documentation dans `.claude/docs/` (configuration locale du mainteneur, absente d'un clone).
