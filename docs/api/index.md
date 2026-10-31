# API Overview

Le serveur API (`server/`) tourne en **Node.js/Express** sur le port **5000** et expose une REST API consommée par le frontend (`app/`) et le bot Discord (`server_discord/`).

## Stack

- **Express** — routeur HTTP
- **Prisma** — ORM / accès base de données PostgreSQL
- **Joi** — validation des inputs (body, params, query)
- **Passport + Battle.net OAuth** — authentification utilisateur
- **`x-internal-token`** — authentification interne pour les appels bot Discord → serveur

## Structure d'un module API

Chaque domaine suit la même organisation en couches :

```
server/src/api/<domain>/
├── <domain>.routes.ts       # Déclaration des routes Express + middleware
├── <domain>.controller.ts   # Handlers HTTP (req/res) — délègue aux usecases
├── <domain>.validation.ts   # Schémas Joi (body, params, query)
├── <domain>.types.ts        # Interfaces TypeScript (inputs, outputs) ; entités : @prisma/client
├── <domain>.errors.ts       # Classes d'erreur métier
├── <domain>.repository.js   # Requêtes Prisma
├── index.js                 # Re-export des usecases
└── usecases/                # Logique métier (un fichier par usecase)
    ├── createCharacter.ts
    ├── updateCharacter.ts
    └── ...
```

## Flux d'une requête

```
Request
  │
  ├── checkPermission()   ← vérifie session (Passport) ou x-internal-token
  ├── validateBody/Query/Params()  ← validation Joi
  │
  ├── controller          ← parse req, appelle le usecase
  ├── usecase             ← logique métier
  └── repository          ← requête Prisma → PostgreSQL
```

## Routes enregistrées

L'inventaire complet des routes, avec leur permission, est **généré** depuis le code :
[`reference.md`](reference.md) (`npm run docs`). Ne pas tenir de liste à la main ici.

## Appels depuis le frontend

Le frontend utilise `apiClient` (Axios) configuré dans
[`app/src/services/api.client.ts`](../../app/src/services/api.client.ts).

```ts
// app/src/services/api.client.ts
import { API_BASE_URL } from '../config/apiConstants'; // = import.meta.env.VITE_API_BASE_URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  withCredentials: true,
});
```

Un interceptor de **réponse** est branché dessus : sur un `401`, il mémorise la page
courante dans `localStorage.auth_redirect` pour y revenir après reconnexion. L'erreur
rejetée est `err.response.data`, pas l'objet Axios ; son statut HTTP se lit avec
`getErrorStatus`.

Aucun header de royaume n'est envoyé : le royaume voyage dans l'URL ou le corps de la
requête, seules sources lues par `checkPermission`.

Le préfixe `/1` n'est **pas** dans la `baseURL` : il vient de `API_VERSION` dans
[`apiConstants.ts`](../../app/src/config/apiConstants.ts) et se compose au niveau de
chaque service.

## Appels depuis le bot Discord

Le bot passe le header `x-internal-token` pour bypasser l'auth Passport. Ce token est vérifié dans `checkPermission.js` :

```js
const isInternalCall = internalToken && internalToken === process.env.DISCORD_BOT_TOKEN;
if (isInternalCall) role = 'admin'; // accès complet
```
