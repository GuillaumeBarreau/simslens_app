# Middleware & Auth

## Authentification

L'auth repose sur deux mécanismes selon l'appelant :

### Session utilisateur (Passport / Battle.net OAuth)

Pour les requêtes venant du frontend, l'utilisateur est identifié via `req.user.id` injecté par Passport après le flow OAuth Battle.net.

### Token interne (bot Discord)

Le bot Discord envoie le header `x-internal-token` pour bypasser l'auth utilisateur. Ce header est vérifié dans `checkPermission.js` :

```js
const isInternalCall = internalToken && internalToken === process.env.DISCORD_BOT_TOKEN;
```

Quand `isInternalCall` est `true`, le middleware accorde le rôle `admin` sans vérifier de session.

---

## `checkPermission` Middleware

**Fichier :** `server/src/middleware/checkPermission.js`

Middleware factory qui vérifie si l'utilisateur a la permission requise sur le realm concerné.

```js
router.post('/', checkPermission(Permission.EDIT_ROSTER), controller.create);
```

### Résolution du `realmId`

Le middleware cherche le `realmId` dans cet ordre :

1. `req.query.realmId`
2. `req.body.realmId`
3. `req.params.realmId`
4. Via le `characterId` du paramètre → lookup en DB
5. Via le `eventId` du paramètre → lookup en DB

Si le `realmId` ne peut pas être déterminé → `400 Realm Context Missing`.

### Rôles et permissions

Les permissions sont définies par rôle dans des fichiers JSON :

```
server/src/shared/config/permissions/
├── permissions.ts        # enum Permission — la liste des permissions
├── role_admin.json
├── role_moderator.json
├── role_member.json
└── role_guest.json
```

| Rôle              | Fichier               |
| ----------------- | --------------------- |
| `admin` / `owner` | `role_admin.json`     |
| `moderator`       | `role_moderator.json` |
| `member`          | `role_member.json`    |
| `guest`           | `role_guest.json`     |

> `owner` et `admin` résolvent vers **le même** jeu de permissions. La distinction
> n'existe pas au niveau du middleware — voir [ADMIN_GUIDE](../ADMIN_GUIDE.md).

Un rôle inconnu (ou `null`, quand l'utilisateur n'appartient pas au realm) laisse
`permissions` vide : toute permission demandée est refusée en `403`.

### Option `allowSelfEdit`

Permet à un utilisateur de modifier son propre personnage même sans la permission `EDIT_ROSTER` :

```js
checkPermission(Permission.EDIT_ROSTER, { allowSelfEdit: true });
```

Le middleware vérifie alors que `character.userId === req.user.id`.

### Codes de retour

| Code  | Cas                                    |
| ----- | -------------------------------------- |
| `401` | Pas de session et pas de token interne |
| `400` | `realmId` impossible à résoudre        |
| `403` | Permission insuffisante                |
| `500` | Erreur interne du middleware           |

---

## `validate` Middleware

**Fichier :** `server/src/shared/middleware/validate.js`

Trois fonctions pour valider les différentes parties de la requête avec un schéma Joi :

```js
const { validateBody, validateQuery, validateParams } = require('../../shared/middleware/validate');

router.post('/', validateBody(createCharacterSchema), controller.create);
router.get('/roster', validateQuery(rosterStatusQuery), controller.listRoster);
router.get('/:id', validateParams(idParam), controller.getById);
```

Le middleware :

- Retourne **toutes** les erreurs (`abortEarly: false`)
- Supprime les champs inconnus (`stripUnknown: true`)
- Convertit les types automatiquement (`convert: true`, ex: `"5"` → `5`)
- En cas d'erreur, appelle `next(new ValidationError(...))` → capturé par le error handler global

```json
// Format de l'erreur renvoyée — voir docs/api/validation-errors.md
{
  "error": "validation_error",
  "message": "Validation failed",
  "errorId": "19fe3465a9c-bafc6a8f-e482-08a6-b4c4997f3655",
  "errors": [
    { "field": "name", "message": "\"name\" is required", "type": "any.required" },
    { "field": "realm", "message": "\"realm\" must be a string", "type": "string.base" }
  ]
}
```
