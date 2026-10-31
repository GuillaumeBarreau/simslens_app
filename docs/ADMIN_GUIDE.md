# 👥 Rôles et permissions

L'accès aux données d'un realm est contrôlé par un rôle attribué à chaque utilisateur
dans la table `realm_owners`, converti en jeu de permissions par
[`checkPermission.js`](../server/src/middleware/checkPermission.js).

## 🎭 Rôles

| Rôle          | Stocké dans         | Jeu de permissions    |
| ------------- | ------------------- | --------------------- |
| **owner**     | `realm_owners.role` | `role_admin.json`     |
| **admin**     | `realm_owners.role` | `role_admin.json`     |
| **moderator** | `realm_owners.role` | `role_moderator.json` |
| **member**    | `realm_owners.role` | `role_member.json`    |
| **guest**     | `realm_owners.role` | `role_guest.json`     |

> ⚠️ **`owner` et `admin` sont strictement équivalents.** Le middleware les fait
> pointer sur le même fichier `role_admin.json` : il n'existe aucune permission qu'un
> owner possède et qu'un admin n'a pas. Si vous voulez une vraie hiérarchie, il faut
> créer un `role_owner.json` et l'ajouter au `if` de `checkPermission.js`.

Un utilisateur sans ligne dans `realm_owners` pour le realm concerné a un rôle `null` :
son jeu de permissions est vide, toute route protégée répond `403`.

Le bot Discord, authentifié par le header `x-internal-token`, obtient le rôle `admin`
sans vérification de session.

## 🔐 Matrice des permissions

Source de vérité : les quatre fichiers de
[`server/src/shared/config/permissions/`](../server/src/shared/config/permissions/).
Ce tableau en est le reflet exact — le régénérer après toute modification.

| Permission            | owner / admin | moderator | member | guest |
| --------------------- | :-----------: | :-------: | :----: | :---: |
| `manage_realm`        |      ✅       |    ❌     |   ❌   |  ❌   |
| `delete_realm`        |      ✅       |    ❌     |   ❌   |  ❌   |
| `view_roster`         |      ✅       |    ✅     |   ✅   |  ❌   |
| `edit_roster`         |      ✅       |    ✅     |   ❌   |  ❌   |
| `sync_characters`     |      ✅       |    ✅     |   ✅   |  ❌   |
| `manage_raid`         |      ✅       |    ✅     |   ❌   |  ❌   |
| `manage_instance`     |      ❌       |    ❌     |   ❌   |  ❌   |
| `view_loot_history`   |      ✅       |    ✅     |   ✅   |  ❌   |
| `assign_loot`         |      ✅       |    ✅     |   ❌   |  ❌   |
| `edit_loot`           |      ✅       |    ✅     |   ❌   |  ❌   |
| `delete_loot`         |      ✅       |    ✅     |   ❌   |  ❌   |
| `import_simc`         |      ✅       |    ✅     |   ✅   |  ❌   |
| `view_wishlist`       |      ✅       |    ✅     |   ✅   |  ❌   |
| `manage_wishlist`     |      ✅       |    ✅     |   ✅   |  ❌   |
| `create_event`        |      ✅       |    ✅     |   ❌   |  ❌   |
| `edit_event`          |      ✅       |    ✅     |   ❌   |  ❌   |
| `delete_event`        |      ✅       |    ❌     |   ❌   |  ❌   |
| `signup_event`        |      ✅       |    ✅     |   ✅   |  ✅   |
| `manage_signups`      |      ✅       |    ✅     |   ❌   |  ❌   |
| `manage_event_roster` |      ✅       |    ✅     |   ❌   |  ❌   |
| `view_activity_log`   |      ✅       |    ✅     |   ❌   |  ❌   |

> 🐛 **`manage_instance` est à `false` pour tous les rôles**, alors que quatre routes
> de [`instance.routes.ts`](../server/src/api/instance/instance.routes.ts) l'exigent.
> Créer, modifier ou supprimer une instance est donc impossible pour n'importe quel
> utilisateur, owner compris. Voir [TECHNICAL_DEBT](TECHNICAL_DEBT.md), point 11.

`signup_event` est la seule permission accordée à `guest` : un invité peut s'inscrire
à un événement, rien d'autre.

`assign_loot` ouvre le tableau d'équité du loot (`GET /1/attendance/loot-equity`,
SIMS-201) : objets reçus, gain estimé, BiS rempli et présence par joueur. Il est
réservé aux officiers, en lecture seule ; les membres n'y ont pas accès.

- **Objets reçus** : historique importé de RCLootCouncil. Les réponses qui ne
  donnent pas l'objet au joueur sont écartées : `Disenchant`, `Désenchanter`,
  `Banking`, `Bank`, `Banque`, `Free`, `Transmog`, `Transmo`, `Pass`, `Autopass`
  (sans casse). Les autres réponses, configurables par guilde, comptent.
- **Gain** : la table `upgrades` ne garde que le dernier sim par
  (personnage, difficulté, spé). Depuis SIMS-229, l'import du loot par le
  compagnon (`POST /1/sync/loot`) **fige** le gain sur la ligne importée
  (`imported_loots.upgradePercent`, `upgradeSimAt`, `upgradeSpecializationId`,
  et la grandeur `upgradeMetric`, `dps` ou `hps`, une valeur vide valant `dps`) :
  sim du même objet (ou de la pièce que le jeton donne à la classe), de la même
  difficulté et de la spé principale, antérieur ou égal au drop — sim courant si
  la date du drop est illisible. Rien n'est figé pour une réponse non attributive
  ni sans sim, sans bloquer l'import ; un sim ultérieur ne modifie jamais la
  valeur figée. L'écran lit le gain figé en priorité ; à défaut (drop plus
  ancien, import CSV, aucun sim à l'import), il l'estime depuis le sim courant
  s'il est antérieur au drop ; sinon « inconnu ». L'infobulle indique « figé » ou
  « estimé ».
- **BiS rempli** : wishlist actuelle de la spé principale, toutes difficultés.
  Un objet marqué « je n'en veux pas » (priorité 5, SIMS-205) n'y compte pas.

## 🎁 Priorité des vœux de wishlist

Chaque vœu porte une priorité (`character_wishlists.priority`, SIMS-205) :
`0` non précisée (valeur historique), `1` BiS, `2` forte, `3` moyenne, `4` faible,
`5` « je n'en veux pas ». Ce dernier niveau garde l'objet sur la fiche du joueur
mais ne compte **jamais** comme un vœu : vue roster et sa complétion,
signalement des autres spés, équité du loot, marqueurs « wishlist » des
upgrades.

Un vœu est signalé « à revoir » s'il est déjà porté (dernier relevé
d'équipement de la spé de la wishlist, à défaut le plus récent toutes spés) ou
si la dernière sim de cette spé, dans la difficulté choisie, ne lui trouve aucun
gain (≤ 0). Un gain simulé positif l'emporte sur « déjà porté » (exemplaire
porté d'une difficulté inférieure : « porté, amélioration possible »). Sans sim
de la spé, il n'est pas signalé (« pas de sim »).

## 🎯 Gérer les administrateurs d'un realm

| Méthode | Endpoint                        | Permission requise   | Description               |
| ------- | ------------------------------- | -------------------- | ------------------------- |
| GET     | `/1/realms/:id/owners`          | `manage_realm`       | Liste des administrateurs |
| POST    | `/1/realms/:id/owners`          | `manage_realm`       | Ajouter un administrateur |
| PATCH   | `/1/realms/:id/owners/:ownerId` | `manage_realm`       | Modifier le rôle          |
| DELETE  | `/1/realms/:id/owners/:ownerId` | `manage_realm`       | Retirer un administrateur |
| GET     | `/1/realms/:id/users`           | responsable du realm | Liste des utilisateurs    |
| GET     | `/1/realms/:id/my-permissions`  | session              | Permissions de l'appelant |

`manage_realm` n'étant accordée qu'à `owner` et `admin`, ce sont les deux seuls rôles
capables de gérer les administrateurs.

`GET /:id/users` et `GET /:id/my-permissions` ne passent pas par `checkPermission` : le
contrôle se fait dans les usecases ([`realm.access.ts`](../server/src/api/realm/realm.access.ts)).
`/users` est réservé aux responsables du realm (owner, admin ou modérateur, sinon 403) ;
`/my-permissions` ne renvoie que le rôle de l'appelant.

### Depuis l'interface

1. Ouvrir la page **Roster**
2. Cliquer sur **Gérer les administrateurs**
3. Sélectionner un utilisateur, choisir un rôle, valider

## 💡 Bonnes pratiques

1. **`admin` plutôt que `owner`** pour les officiers — les deux rôles sont de toute
   façon équivalents, autant garder `owner` comme marqueur du créateur du realm.
2. **`moderator`** pour les membres de confiance : ils gèrent roster, loot et
   événements, mais ne peuvent ni supprimer un événement ni toucher aux paramètres du
   realm.
3. **`member`** pour les raiders : consultation, wishlist, import SimC, inscription.
4. **`guest`** pour les externes : inscription aux événements uniquement.
5. **Réviser périodiquement** la liste des administrateurs et retirer les inactifs.

## 🔧 Modifier les permissions

Les permissions sont des données, pas du code : éditer le JSON du rôle concerné suffit,
sans redéploiement de logique.

```bash
# 1. Éditer server/src/shared/config/permissions/role_moderator.json
# 2. Propager vers le frontend
npm run sync:permissions
```

Toute nouvelle permission doit être ajoutée **à la fois** dans l'enum
[`permissions.ts`](../server/src/shared/config/permissions/permissions.ts) et dans les
quatre fichiers de rôle, avec une valeur `true` ou `false` explicite. Le test
[`permissionsConsistency.test.ts`](../server/src/shared/__tests__/permissionsConsistency.test.ts)
échoue si une clé d'un fichier de rôle est absente de l'enum, si une valeur de l'enum
manque dans un fichier de rôle, ou si l'enum du frontend n'est pas resynchronisée.
