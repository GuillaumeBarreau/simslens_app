# Validation & Erreurs

## Validation avec Joi

Les inputs sont validés avec **Joi** via les middlewares `validateBody`, `validateParams`, `validateQuery` (`server/src/shared/middleware/validate.js`).

La validation s'exécute **avant** le controller. En cas d'échec, elle appelle `next(new ValidationError(...))` sans jamais atteindre le handler.

```js
router.post('/', validateBody(createCharacterSchema), controller.create);
```

### Options appliquées

| Option         | Valeur  | Effet                                                         |
| -------------- | ------- | ------------------------------------------------------------- |
| `abortEarly`   | `false` | Toutes les erreurs sont retournées, pas seulement la première |
| `stripUnknown` | `true`  | Les champs inconnus sont silencieusement supprimés            |
| `convert`      | `true`  | Conversion automatique de types (ex: `"5"` → `5`)             |

> ⚠️ **`stripUnknown` supprime ce que le schéma ne déclare pas.** Un paramètre lu
> par le handler mais absent du schéma n'arrive jamais jusqu'à lui — sans erreur,
> sans log. Avant d'ajouter un schéma, vérifier chaque `req.query` / `req.body`
> du controller et déclarer **toutes** les clés qu'il lit, y compris les
> optionnelles.
>
> Exemple : `roster.validation.js` déclare un `realmScopeWithBossQuery` distinct
> parce que trois routes lisent un `bossId` facultatif dans la query.

> ⚠️ **La valeur convertie est réécrite sur la requête.** Un `.valid(...).insensitive()`
> normalise la casse de la valeur, ce qui n'est pas toujours souhaitable : voir
> `blizzard.validation.js`, où la région est validée par motif pour préserver la
> casse attendue par l'API Blizzard.

### Format de réponse en cas d'erreur

Le payload est construit par [`errorHandler.js`](../../server/src/shared/middleware/errorHandler.js) :
`error` porte le **code machine** (`err.code`), le libellé est dans `message`, et le
détail Joi est dans `errors` — pas `details`.

```json
{
  "error": "validation_error",
  "message": "Validation failed",
  "errorId": "19fe3465a9c-bafc6a8f-e482-08a6-b4c4997f3655",
  "errors": [
    { "field": "name", "message": "\"name\" is required", "type": "any.required" },
    {
      "field": "region",
      "message": "\"region\" must be one of [EU, US, KR, TW, CN]",
      "type": "any.only"
    }
  ]
}
```

`errorId` est présent sur **toutes** les réponses d'erreur et repris dans les logs
serveur — c'est la clé pour relier un retour utilisateur à sa trace.

Un champ `stack` s'ajoute hors production, ou si `INCLUDE_STACK_IN_RESPONSES=true`.

---

## Erreurs métier

Chaque module définit ses propres classes d'erreur dans `<domain>.errors.ts`, qui étendent une classe de base :

```ts
export class CharacterError extends Error {
  statusCode: number; // Code HTTP à renvoyer
  code: string; // Code machine (ex: 'not_found', 'conflict')

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

### Erreurs disponibles dans `character.errors.ts`

| Classe                        | HTTP | `code`                   | Quand l'utiliser                                     |
| ----------------------------- | ---- | ------------------------ | ---------------------------------------------------- |
| `CharacterNotFoundError`      | 404  | `not_found`              | Personnage introuvable, ou hors du royaume vérifié   |
| `CharacterAlreadyExistsError` | 409  | `conflict`               | Création d'un personnage déjà existant (nom + realm) |
| `CharacterValidationError`    | 400  | `validation_error`       | Validation métier (hors Joi)                         |
| `UnknownCharacterClassError`  | 400  | `invalid_class`          | Classe inconnue après `normalizeClass`               |
| `InvalidSpecializationError`  | 400  | `invalid_specialization` | Spé (nom ou id) hors de la classe du personnage      |

Classe et spé d'un personnage passent par `resolveSpecialization`
(`server/src/api/character/resolveSpecialization.ts`, SIMS-213) : la classe est
normalisée, la spé retrouvée dans cette classe par identifiant ou par nom anglais
(casse ignorée), et `spec` / `specializationId` sont écrits ensemble. À réutiliser
partout où une classe ou une spé arrive de l'extérieur (formulaire, Blizzard).

Un identifiant invalide n'a pas d'erreur métier : le schéma Joi de la route
(`routeId`) le refuse avant le controller (`validation_error`).

### Lancer une erreur dans un usecase

```ts
import { CharacterNotFoundError } from '../character.errors';

export async function getCharacterById(id: number) {
  const character = await repository.findById(id);
  if (!character) throw new CharacterNotFoundError(id);
  return character;
}
```

---

## Error Handler global

Le controller ne gère pas les erreurs lui-même. Express 5 transmet au handler
global toute erreur levée par un handler `async` : pas de `try/catch`, pas de
`next(err)` à écrire.

```ts
export async function getById(req: Request, res: Response) {
  const { id } = validated<{ id: number }>(req, 'params');
  res.json(await usecases.getCharacterById(id));
}
```

`validated` (`server/src/shared/middleware/validated.ts`) lit la partie de la
requête déjà contrôlée par `validateParams` / `validateQuery` / `validateBody`,
typée et convertie par Joi. Si la route n'a pas de schéma pour cette partie, il
lève une erreur 500 `unvalidated_request` plutôt que de laisser passer une
entrée brute.

Le handler global inspecte `err.statusCode` pour déterminer le code HTTP à renvoyer. Les erreurs qui étendent les classes métier sont donc automatiquement formatées correctement.

---

## Codes d'erreur courants

| HTTP | `code`                   | Cause                                                    |
| ---- | ------------------------ | -------------------------------------------------------- |
| 400  | `validation_error`       | Champ manquant ou invalide (Joi)                         |
| 400  | `invalid_id`             | Identifiant ambigu (`1e1`, `12abc`…), `checkPermission`  |
| 400  | `realm_conflict`         | Sources de royaume contradictoires (query, corps, route) |
| 400  | `invalid_class`          | Classe de personnage inconnue                            |
| 400  | `invalid_specialization` | Spécialisation hors de la classe du personnage           |
| 401  | —                        | Non authentifié (pas de session ni de token interne)     |
| 403  | —                        | Permission insuffisante sur le realm                     |
| 404  | `not_found`              | Ressource introuvable                                    |
| 409  | `conflict`               | Ressource déjà existante                                 |
| 500  | —                        | Erreur inattendue                                        |
