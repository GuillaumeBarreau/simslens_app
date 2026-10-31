# Ajouter un nouveau module API

Ce guide décrit le pattern à suivre pour créer un nouveau module. Les exemples
reprennent le domaine `character`, module de référence
(`server/src/api/character/`) ; les règles complètes sont dans
[`architecture.md`](architecture.md#forme-dun-controller).

## Structure des fichiers

```
server/src/api/<domain>/
├── <domain>.routes.ts
├── <domain>.controller.ts
├── <domain>.validation.ts
├── <domain>.types.ts
├── <domain>.errors.ts
├── <domain>.repository.js
├── index.js
└── usecases/
    ├── create<Domain>.ts
    ├── update<Domain>.ts
    └── ...
```

---

## 1. Types (`<domain>.types.ts`)

Déclare les interfaces d'input/output utilisées par les usecases et le controller.
Les entités viennent de `@prisma/client`, jamais redéclarées à la main (pas de
`<domain>.schema.ts`, pas de Zod côté serveur) :

```ts
import type { characters } from '@prisma/client';

export type CharacterEntity = characters;

export interface CreateCharacterInput {
  name: CharacterEntity['name'];
  realm: CharacterEntity['realm'];
  class: CharacterEntity['class'];
  spec?: CharacterEntity['spec'];
  region?: CharacterEntity['region'];
  discordTag?: CharacterEntity['discordTag'];
}

export interface UpdateCharacterInput {
  name?: CharacterEntity['name'];
  realm?: CharacterEntity['realm'];
  status?: string;
}
```

---

## 2. Erreurs (`<domain>.errors.ts`)

Crée des classes d'erreur métier qui étendent `CharacterError` (ou une base commune) :

```ts
export class CharacterError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class CharacterNotFoundError extends CharacterError {
  constructor(identifier?: string | number) {
    super(`Personnage non trouvé : ${identifier}`, 404, 'not_found');
  }
}

export class CharacterAlreadyExistsError extends CharacterError {
  constructor(name: string, realm: string) {
    super(`${name} existe déjà sur ${realm}`, 409, 'conflict');
  }
}
```

---

## 3. Validation (`<domain>.validation.ts`)

Schémas Joi pour chaque partie lue par le controller (body, params, query) —
y compris les query de lecture. Les identifiants de route passent par
`routeId` (`shared/validation/routeId.ts`), qui refuse `"1e1"` : Joi et
`checkPermission` lisent ainsi toujours le même identifiant.

```ts
import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

export const createCharacterSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  realm: Joi.string().min(2).max(50).required(),
  region: Joi.string().valid('EU', 'US', 'KR', 'TW', 'CN').default('EU'),
  class: Joi.string().required(),
  spec: Joi.string().optional(),
  discordTag: Joi.string().allow('', null).optional(),
});

export const updateCharacterSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  status: Joi.string().valid('pending', 'approved', 'archived').optional(),
}).min(1); // Au moins un champ requis

export const characterIdParam = Joi.object({
  characterId: routeId.required(),
});

/** Liste "5,6,7" convertie en [5, 6, 7] par Joi : pas de split dans le controller. */
export const bulkGearQuery = Joi.object({
  ids: Joi.string()
    .pattern(/^[1-9]\d*(\s*,\s*[1-9]\d*)*$/)
    .custom((value: string) => value.split(',').map((id) => Number(id.trim())))
    .required(),
});
```

---

## 4. Repository (`<domain>.repository.js`)

Requêtes Prisma directes, sans logique métier :

```js
const { prisma } = require('../../data');

async function findAll(realmId) {
  return prisma.characters.findMany({
    where: { realmId, archived: 0, status: { not: 'pending' } },
  });
}

async function findById(id) {
  return prisma.characters.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.characters.create({ data });
}

module.exports = { findAll, findById, create };
```

---

## 5. Usecases (`usecases/`)

Un fichier par usecase. Contient la logique métier, utilise le repository et
les intégrations, importés en ESM (un `require` échappe à `vi.mock`) :

```ts
// usecases/getBlizzardEquipment.ts
import { getCharacterEquipment } from '../../../integrations/blizzard/api';
import { CharacterNotFoundError } from '../character.errors';
import characterRepository from '../character.repository';

export async function getBlizzardEquipment(characterId: number) {
  const character = await characterRepository.findCharacterById(characterId);
  if (!character) throw new CharacterNotFoundError(characterId);

  const equipment = await getCharacterEquipment(
    character.region || 'eu',
    character.realm,
    character.name,
  );
  return { equipment };
}
```

Un usecase d'écriture sur une ressource de la route reçoit le royaume vérifié
par `checkPermission` et l'y rattache (`character.access.ts`, voir
[architecture.md](architecture.md#ressource-rattachée-au-royaume)).

`usecases/index.ts` re-exporte tous les usecases ; l'`index.js` du module
expose `{ controller, repositories, routes, usecases }`.

Chaque usecase a ses tests, repository et intégrations mockés
(`character/__tests__/`) :

```ts
const findCharacterById = vi.fn();

vi.mock('../character.repository', () => ({
  default: { findCharacterById: (...a: unknown[]) => findCharacterById(...a) },
}));
```

---

## 6. Controller (`<domain>.controller.ts`)

Lit l'entrée validée, appelle **un** usecase, renvoie la réponse. Ne contient pas
de logique métier :

```ts
import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { CreateCharacterInput } from './character.types';
import * as usecases from './usecases';

export async function create(req: Request, res: Response) {
  const input = validated<CreateCharacterInput>(req, 'body');
  res.status(201).json(await usecases.createCharacter(input));
}
```

- pas de `try/catch` : Express 5 transmet les erreurs des handlers `async` à
  `errorHandler` ;
- pas de `res.status(4xx)` : le usecase lève une erreur (`NotFoundError`…) ;
- pas de `parseInt` ni de cast : `validated<T>` rend la valeur convertie par Joi,
  et lève une erreur 500 si la route n'a pas de schéma pour cette partie ;
- pas de `module.exports` : le fichier n'utilise que `export` ;
- sur une route protégée, le royaume passé au usecase est celui vérifié par
  `checkPermission` (`checkedRealmId` dans `character.controller.ts`), jamais un
  `realmId` du corps ou de la query. `req.realmId` seul ne le prouve pas :
  `injectRealmId`, monté sur toute l'app, le pose aussi sans vérification. Seul
  `checkPermission` pose `req.realmRole`.

Règles complètes : [`architecture.md`](architecture.md#forme-dun-controller).

---

## 7. Routes (`<domain>.routes.ts`)

Assemble les middlewares et branche les controllers :

```ts
import express from 'express';

import checkPermission from '../../middleware/checkPermission';
import { Permission } from '../../shared/config/permissions/permissions';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import * as controller from './character.controller';
import {
  characterIdParam,
  createCharacterSchema,
  idParam,
  listCharactersQuery,
  updateCharacterSchema,
} from './character.validation';

const router = express.Router();

router.get('/', validateQuery(listCharactersQuery), controller.list);
router.get('/:characterId/gear/latest', validateParams(characterIdParam), controller.getLatestGear);

router.post(
  '/',
  checkPermission(Permission.EDIT_ROSTER),
  validateBody(createCharacterSchema),
  controller.create,
);

router.post(
  '/:id',
  checkPermission(Permission.EDIT_ROSTER, { allowSelfEdit: true }),
  validateParams(idParam),
  validateBody(updateCharacterSchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.EDIT_ROSTER),
  validateParams(idParam),
  controller.archive,
);

module.exports = router;
```

Le routeur reste exporté par `module.exports`, seul export du fichier : l'`index.js`
du module le charge avec `require`, comme `app.js`.

---

## 8. Enregistrer le module

Monter les routes dans le fichier principal du serveur :

```js
// server/src/app.js
const { routes: characterRoutes } = require('./api/character');
app.use('/1/character', characterRoutes);
```
