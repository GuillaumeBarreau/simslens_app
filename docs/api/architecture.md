# Architecture de l'API — migration en cours

Objectif : faire converger l'API vers une organisation par feature, sans casser
l'existant. La migration est **partielle** — deux patterns coexistent aujourd'hui.

> État au 2026-10-08. Documentation détaillée du pattern cible :
> [`docs/api/routes.md`](routes.md).

## Où on en est

| Pattern                         | Modules | Lesquels        |
| ------------------------------- | ------: | --------------- |
| **Cible** — `usecases/` + `.ts` |      29 | la majorité     |
| **Historique** — `.service.js`  |       8 | voir ci-dessous |

Huit modules gardent un `.service.js` :

| Module                                    | Pourquoi                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `event`, `composition`                    | 700 et 985 lignes : à découper par étapes                 |
| `blizzard`, `item_upgrade`, `item_import` | volumineux, partiellement extraits                        |
| `auth`                                    | `token.service` reste un client OAuth, pas un cas d'usage |
| `instance_boss_killed`, `boss_killed`     | cassés ou morts — dettes 13 et 18                         |

Le reste suit encore le découpage controller → service → repository.

`event` a commencé : les séries récurrentes (SIMS-200) sont en usecases
(`event/usecases/`) et créent ou modifient leurs occurrences en appelant
`event.service`, pour garder un seul chemin vers Discord.

La migration vers les usecases est longue ; en attendant, les briques du pattern
cible qui ne dépendent pas de ce découpage ont été généralisées à tous les
modules :

| Brique                                     | Couverture |
| ------------------------------------------ | ---------- |
| `index.js` (barrel, consommé par `app.js`) | 36 / 36    |
| `<domain>.validation.*` (schémas Joi)      | 31 / 36    |
| Erreurs déléguées à `errorHandler`         | tous       |

Compte des 36 modules à routes de `server/src/api` (`raid_difficulty` n'a
qu'un repository). Les cinq modules sans schéma de validation : `auth` (flux
OAuth, pas d'entrée à valider), `region` (une liste, sans paramètre),
`raid_items` (une lecture publique dont les paramètres de route ne sont pas
encore validés), et `boss_killed` / `instance_boss_killed` (voir la dette
technique).

## Pattern cible

`character` sert de module de référence : son code suit les règles ci-dessous
(#161).

```
server/src/api/character/
├── character.routes.ts       # routes Express + middlewares
├── character.controller.ts   # parse req/res, délègue
├── character.validation.ts   # schémas Joi
├── character.types.ts        # interfaces d'entrée/sortie (entités : @prisma/client)
├── character.errors.ts       # erreurs métier (statusCode + code)
├── character.access.ts       # rattachement de la ressource au royaume vérifié
├── character.repository.js   # requêtes Prisma, sans logique
├── index.js                  # re-export { routes, usecases }
├── __tests__/                # usecases (repository et intégrations mockés), controller, schémas
└── usecases/                 # un fichier par cas d'usage
    ├── createCharacter.ts
    └── updateCharacter.ts
```

La différence de fond avec l'ancien pattern : la logique métier n'est plus dans un
`.service.js` monolithique mais éclatée en usecases unitaires, chacun testable
isolément.

Il n'y a **pas** de fichier `<domain>.schema.ts` : la validation des entrées est
faite par Joi (`<domain>.validation.ts`), et les types des entités viennent de
`@prisma/client`. Zod n'est pas utilisé côté serveur.

### Forme d'un controller

Le controller traduit HTTP ↔ usecase, et rien d'autre :

```ts
import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import { getCharacterEnchantmentReport } from './usecases';

export async function verifyEnchantments(req: Request, res: Response) {
  const { characterId } = validated<{ characterId: number }>(req, 'params');
  res.json(await getCharacterEnchantmentReport(characterId));
}
```

- **Pas de `try/catch`.** Express 5 transmet à `errorHandler` toute erreur levée
  par un handler `async`, y compris après un `await` (testé dans
  `shared/middleware/__tests__/validated.test.ts`).
- **Pas de `res.status(4xx)`.** Le usecase lève une `AppError`
  (`NotFoundError`, `ForbiddenError`…) ou une erreur de `<domain>.errors.ts` ;
  `errorHandler` produit le statut, le code et l'`errorId`.
- **Pas de `parseInt` ni de `as unknown as`.** Chaque entrée lue a un schéma Joi
  dans la route ; Joi convertit les types et `validated<T>(req, part)` les rend
  typés. `validated` lève une erreur 500 si aucun schéma n'a contrôlé cette
  partie de la requête.
- **Utilisateur connecté exigé** : `requireUserId(req)`
  (`shared/http/requestUser.ts`) lève une 401. `checkPermission` laisse passer
  les appels internes du bot, qui n'ont pas d'utilisateur.
- **Un seul usecase par handler.** Combiner deux usecases ou décider d'un cas
  d'erreur est de la logique : elle va dans un usecase.
- **Aucun import** de repository, de `prisma` (`data/`), d'`integrations/` ni de
  `services/`.
- **ESM pur** : `export function`, sans `module.exports` (cause de SIMS-130).

### Accès aux données dans un usecase

Le repository est l'emplacement par défaut des requêtes Prisma, et le seul pour
une requête partagée entre plusieurs usecases ou modules.

Un usecase peut appeler `prisma` directement pour une requête qui lui est
propre, à une condition : la logique de décision (calculs, verdicts, tris)
vit dans une fonction pure à part, testée sans base. Le usecase se contente
alors de rassembler les données. Exemples : `enchantments.results.ts`,
`roster.availability.ts`.

`prisma` n'est jamais importé dans un controller.

### Ressource rattachée au royaume

`checkPermission` vérifie les droits sur un royaume et, pour un personnage ou
un événement de la route, que la ressource en fait partie. Il laisse passer
une ressource introuvable ou sans royaume : c'est au usecase d'écriture de la
rattacher au royaume vérifié (`req.realmId`), sinon un officier d'une guilde
agit sur la ressource d'une autre. Le controller transmet ce royaume, jamais
un `realmId` lu dans le corps ou la query. Exemples : `character.access.ts`,
`guest.access.ts`, `instance.access.ts`.

## Pattern historique

```
server/src/api/<domain>/
├── <domain>.routes.js        # routes + middlewares + schémas de validation
├── <domain>.controller.js    # parse req/res, délègue — jamais de requête SQL
├── <domain>.validation.js    # schémas Joi
├── <domain>.service.js       # ← toute la logique métier
├── <domain>.repository.js    # requêtes Prisma, sans logique
└── index.js                  # re-export { controller, service, repositories, routes }
```

Trois règles valent pour les deux patterns :

- **Le controller ne parle pas au repository.** Il passe par le service (ou un
  usecase). Une requête Prisma n'a jamais sa place dans un controller.
- **Le controller ne valide pas.** Les contrôles de présence et de type vivent
  dans les schémas ; le service garde les règles métier (plafonds, cohérence des
  dates, droits).
- **Le controller ne formate pas les erreurs.** Il laisse l'erreur remonter
  (sans `try/catch` en Express 5) et `errorHandler` produit le statut, le code
  et l'`errorId`.

## Socle partagé

```
server/src/shared/
├── config/
│   ├── index.js              # chargement + validation Joi de process.env
│   └── permissions/          # enum Permission + role_*.json
├── errors/
│   └── AppError.js           # AppError, ValidationError, NotFoundError, …
├── middleware/
│   ├── errorHandler.js       # formatage final des erreurs + errorId
│   └── validate.js           # validateBody / validateQuery / validateParams
└── gracefulShutdown.js
```

> La config est validée avec **Joi**, pas Zod. Zod n'est utilisé que côté frontend,
> pour typer les entités — voir [`docs/frontend/forms.md`](../frontend/forms.md).

## Deux règles apprises en migrant

Elles conditionnent l'intérêt du découpage.

**1. Un use case importe ses dépendances en ESM, pas avec `require`.**

```ts
import guestRepository from '../guest.repository'; // ✅ mockable
const guestRepository = require('../guest.repository'); // ❌ échappe à vi.mock
```

Vitest transforme les `.ts` en ESM ; un `require` y est résolu directement par
Node et contourne le registre de mocks. Le use case devient alors intestable
sans une vraie base de données — ce qui annule le bénéfice du découpage.
Les usecases de `character` montrent la forme attendue, et leurs tests
(`character/__tests__/`) la façon de mocker repository et intégrations.

**2. Un repository resté en `.js` a besoin d'un `.d.ts` à côté.**

Leurs JSDoc annoncent `@returns {Promise<Object>}`, que TypeScript prend au
mot : `Object` n'expose aucune propriété, et tout accès échoue à la
compilation. Un `<domain>.repository.d.ts` décrit la forme réelle des données
sans qu'il faille réécrire les requêtes Prisma.

À défaut de `.d.ts`, des JSDoc exactes (`@returns` décrivant la forme réelle)
suffisent : c'est le cas de `character.repository.js`, dont un `.d.ts`
changerait aussi le typage des modules `auth` qui l'importent.

Les entités elles-mêmes viennent de Prisma (`import type { raid_guests } from
'@prisma/client'`), jamais redéclarées à la main.

**3. Écrire le `.d.ts` révèle souvent un écart avec le code.**

Décrire un repository oblige à confronter ses signatures à ses appelants.
Cette confrontation a mis au jour, entre autres, un garde d'autorisation
portant sur une colonne inexistante (dette 20), un champ toujours nul
(dette 21), un jeton passé à la place d'une région (corrigé), et trois
méthodes appelées sans exister (dette 19). Aucun de ces écarts n'était
visible à la lecture.

## Règles de migration

- Migrer **un module par PR**, pour garder les revues lisibles.
- Garder les routes co-localisées avec le module.
- Toute nouvelle logique passe par `usecases/`, jamais par un nouveau `.service.js`.
- Les utilitaires partagés (db, logger, config) restent sous `shared/` et sont
  importés par les modules — jamais l'inverse.
- Un module qui expose des routes expose aussi un `index.js` ; `app.js` importe
  `{ routes }` depuis le module, jamais son chemin interne.
- Les constantes partagées entre modules (rôles, specs, classes) vivent sous
  `shared/constants/`, pas dupliquées dans chaque service.
