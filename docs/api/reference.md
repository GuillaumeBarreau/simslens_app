## 🔍 Inventaire des routes API

> **Généré depuis le code** — ne pas éditer à la main.
> Régénérer après toute modification de `app.js` ou d'un `*.routes.*`.
>
> Colonne _Permission_ : valeur passée à `checkPermission()`. Vide = aucune
> vérification de permission sur la route (l'auth de session reste requise
> selon le middleware global).
>
> Routes sans aucun garde : liste motivée dans
> `server/src/__tests__/routeGuards.exceptions.ts`.

### `/auth` — module `auth`

| Méthode | Chemin                   | Permission |
| :------ | :----------------------- | :--------- |
| `GET`   | `/auth/bnet`             | —          |
| `GET`   | `/auth/dev-login`        | —          |
| `GET`   | `/auth/bnet/callback`    | —          |
| `GET`   | `/auth/me`               | —          |
| `GET`   | `/auth/logout`           | —          |
| `GET`   | `/auth/discord`          | —          |
| `GET`   | `/auth/discord/callback` | —          |

### `/1/character` — module `character`

| Méthode  | Chemin                                         | Permission        |
| :------- | :--------------------------------------------- | :---------------- |
| `GET`    | `/1/character`                                 | —                 |
| `GET`    | `/1/character/classes/specializations`         | —                 |
| `GET`    | `/1/character/:id/specializations`             | `VIEW_ROSTER`     |
| `PUT`    | `/1/character/:id/specializations`             | `EDIT_ROSTER`     |
| `GET`    | `/1/character/roster-status`                   | —                 |
| `GET`    | `/1/character/roster`                          | —                 |
| `GET`    | `/1/character/pending`                         | —                 |
| `GET`    | `/1/character/gear/bulk`                       | —                 |
| `GET`    | `/1/character/keys/history`                    | —                 |
| `GET`    | `/1/character/:characterId/gear/latest`        | —                 |
| `GET`    | `/1/character/:characterId/equipment/blizzard` | —                 |
| `GET`    | `/1/character/:characterId/mount/:mountId`     | —                 |
| `GET`    | `/1/character/:name`                           | —                 |
| `GET`    | `/1/character/discord/:tag`                    | —                 |
| `POST`   | `/1/character`                                 | `EDIT_ROSTER`     |
| `POST`   | `/1/character/update-all`                      | `EDIT_ROSTER`     |
| `POST`   | `/1/character/:characterId/sync-blizzard`      | `SYNC_CHARACTERS` |
| `POST`   | `/1/character/:id`                             | `EDIT_ROSTER`     |
| `DELETE` | `/1/character/:id`                             | `EDIT_ROSTER`     |

### `/1/upgrade` — module `item_upgrade`

| Méthode  | Chemin                                      | Permission    |
| :------- | :------------------------------------------ | :------------ |
| `GET`    | `/1/upgrade`                                | —             |
| `DELETE` | `/1/upgrade`                                | `EDIT_ROSTER` |
| `POST`   | `/1/upgrade/batch`                          | —             |
| `POST`   | `/1/upgrade/wishlist-batch`                 | —             |
| `GET`    | `/1/upgrade/by-boss/character/:characterId` | —             |
| `GET`    | `/1/upgrade/byItem/:itemID/:difficulty`     | —             |
| `GET`    | `/1/upgrade/:name/:itemID/:difficulty`      | —             |

### `/1/update` — module `dataUpdater`

| Méthode | Chemin                              | Permission |
| :------ | :---------------------------------- | :--------- |
| `GET`   | `/1/update/report/:reportID`        | —          |
| `GET`   | `/1/update/report/queue/stats`      | —          |
| `GET`   | `/1/update/report/status/:reportID` | —          |

### `/1/item` — module `item_listed`

| Méthode | Chemin            | Permission |
| :------ | :---------------- | :--------- |
| `GET`   | `/1/item/:itemID` | —          |

### `/1/import` — module `item_import`

| Méthode | Chemin                 | Permission          |
| :------ | :--------------------- | :------------------ |
| `POST`  | `/1/import/upload`     | `IMPORT_SIMC`       |
| `GET`   | `/1/import/loots/bulk` | `VIEW_LOOT_HISTORY` |

### `/1/instance` — module `instance`

| Méthode  | Chemin                              | Permission        |
| :------- | :---------------------------------- | :---------------- |
| `GET`    | `/1/instance`                       | —                 |
| `GET`    | `/1/instance/:id`                   | —                 |
| `POST`   | `/1/instance`                       | `MANAGE_INSTANCE` |
| `POST`   | `/1/instance/:id/initialize-bosses` | `MANAGE_INSTANCE` |
| `PUT`    | `/1/instance/:id`                   | `MANAGE_INSTANCE` |
| `DELETE` | `/1/instance/:id`                   | `MANAGE_INSTANCE` |

### `/1/instances/:instanceId/bosses` — module `instance_boss_killed`

| Méthode | Chemin                                              | Permission        |
| :------ | :-------------------------------------------------- | :---------------- |
| `GET`   | `/1/instances/:instanceId/bosses`                   | —                 |
| `GET`   | `/1/instances/:instanceId/bosses/:bossId`           | —                 |
| `PATCH` | `/1/instances/:instanceId/bosses/:bossId/kill`      | `MANAGE_INSTANCE` |
| `PATCH` | `/1/instances/:instanceId/bosses/:bossId/resurrect` | `MANAGE_INSTANCE` |

### `/1/bosses` — module `boss_listed`

| Méthode | Chemin      | Permission |
| :------ | :---------- | :--------- |
| `GET`   | `/1/bosses` | —          |

### `/1/raids` — module `raid_listed`

| Méthode | Chemin                    | Permission |
| :------ | :------------------------ | :--------- |
| `GET`   | `/1/raids`                | —          |
| `GET`   | `/1/raids/bosses`         | —          |
| `GET`   | `/1/raids/:raidId/bosses` | —          |

### `/1/loots` — module `item_dropped`

| Méthode  | Chemin         | Permission    |
| :------- | :------------- | :------------ |
| `GET`    | `/1/loots`     | —             |
| `GET`    | `/1/loots/:id` | —             |
| `POST`   | `/1/loots`     | `MANAGE_RAID` |
| `PATCH`  | `/1/loots/:id` | `MANAGE_RAID` |
| `DELETE` | `/1/loots/:id` | `MANAGE_RAID` |

### `/1/realms` — module `realm`

| Méthode  | Chemin                                 | Permission     |
| :------- | :------------------------------------- | :------------- |
| `GET`    | `/1/realms`                            | —              |
| `POST`   | `/1/realms`                            | —              |
| `GET`    | `/1/realms/check`                      | —              |
| `GET`    | `/1/realms/:id`                        | —              |
| `PATCH`  | `/1/realms/:id/add-character`          | `EDIT_ROSTER`  |
| `GET`    | `/1/realms/:id/owners`                 | `MANAGE_REALM` |
| `POST`   | `/1/realms/:id/owners`                 | `MANAGE_REALM` |
| `DELETE` | `/1/realms/:id/owners/:ownerId`        | `MANAGE_REALM` |
| `PATCH`  | `/1/realms/:id/owners/:ownerId`        | `MANAGE_REALM` |
| `GET`    | `/1/realms/:id/users`                  | —              |
| `GET`    | `/1/realms/:id/my-permissions`         | —              |
| `PATCH`  | `/1/realms/:id/settings`               | `MANAGE_REALM` |
| `GET`    | `/1/realms/:id/invites`                | `MANAGE_REALM` |
| `POST`   | `/1/realms/:id/invites`                | `MANAGE_REALM` |
| `DELETE` | `/1/realms/:id/invites/:codeId`        | `MANAGE_REALM` |
| `GET`    | `/1/realms/:id/guest-members`          | `MANAGE_REALM` |
| `DELETE` | `/1/realms/:id/guest-members/:guestId` | `MANAGE_REALM` |

### `/1/regions` — module `region`

| Méthode | Chemin       | Permission |
| :------ | :----------- | :--------- |
| `GET`   | `/1/regions` | —          |

### `/1/blizzard` — module `blizzard`

| Méthode | Chemin                     | Permission    |
| :------ | :------------------------- | :------------ |
| `GET`   | `/1/blizzard/characters`   | —             |
| `POST`  | `/1/blizzard/claim`        | —             |
| `GET`   | `/1/blizzard/guild/roster` | `EDIT_ROSTER` |
| `POST`  | `/1/blizzard/guild/import` | `EDIT_ROSTER` |

### `/1` — module `wishlist`

| Méthode | Chemin                                                 | Permission        |
| :------ | :----------------------------------------------------- | :---------------- |
| `GET`   | `/1/characters/:id/wishlist/specs`                     | `VIEW_WISHLIST`   |
| `GET`   | `/1/characters/:id/wishlist`                           | `VIEW_WISHLIST`   |
| `GET`   | `/1/characters/:id/wishlist/status`                    | `VIEW_WISHLIST`   |
| `GET`   | `/1/characters/:id/wishlist/:slot/alternatives`        | `VIEW_WISHLIST`   |
| `PUT`   | `/1/characters/:id/wishlist/:slot`                     | `MANAGE_WISHLIST` |
| `POST`  | `/1/characters/:id/wishlist/copy-from/:sourceId`       | `MANAGE_WISHLIST` |
| `GET`   | `/1/extensions/:extension/seasons/:season/items/:slot` | —                 |
| `GET`   | `/1/roster/:region/:guildName`                         | `VIEW_WISHLIST`   |
| `GET`   | `/1/roster/:region/:guildName/wishlist-hidden-specs`   | `VIEW_WISHLIST`   |
| `GET`   | `/1/roster/:region/:guildName/wishlist-completion`     | `VIEW_WISHLIST`   |

### `/1` — module `talent`

| Méthode | Chemin                             | Permission        |
| :------ | :--------------------------------- | :---------------- |
| `GET`   | `/1/characters/:id/talent-tree`    | `VIEW_WISHLIST`   |
| `GET`   | `/1/characters/:id/talents`        | `VIEW_WISHLIST`   |
| `PUT`   | `/1/characters/:id/talents`        | `MANAGE_WISHLIST` |
| `POST`  | `/1/characters/:id/talents/import` | `MANAGE_WISHLIST` |

### `/1` — module `item_tokens`

| Méthode | Chemin                           | Permission |
| :------ | :------------------------------- | :--------- |
| `GET`   | `/1/items/:itemId/token-rewards` | —          |
| `GET`   | `/1/items/:itemId/is-token`      | —          |
| `GET`   | `/1/tokens`                      | —          |

### `/1/events` — module `signup`

| Méthode  | Chemin                                   | Permission       |
| :------- | :--------------------------------------- | :--------------- |
| `POST`   | `/1/events/:eventId/signup`              | `SIGNUP_EVENT`   |
| `GET`    | `/1/events/:eventId/roster`              | —                |
| `DELETE` | `/1/events/:eventId/signup/:characterId` | `MANAGE_SIGNUPS` |

### `/1/events` — module `guest`

| Méthode  | Chemin                                                   | Permission       |
| :------- | :------------------------------------------------------- | :--------------- |
| `POST`   | `/1/events/:eventId/guests`                              | `SIGNUP_EVENT`   |
| `DELETE` | `/1/events/:eventId/guests/:guestId`                     | `MANAGE_SIGNUPS` |
| `GET`    | `/1/events/:eventId/guests/assignments`                  | `SIGNUP_EVENT`   |
| `PUT`    | `/1/events/:eventId/guests/:guestId/assignments/:bossId` | `MANAGE_SIGNUPS` |
| `DELETE` | `/1/events/:eventId/guests/:guestId/assignments/:bossId` | `MANAGE_SIGNUPS` |

### `/1/events` — module `roster`

| Méthode  | Chemin                                               | Permission            |
| :------- | :--------------------------------------------------- | :-------------------- |
| `GET`    | `/1/events/:eventId/roster-assignments`              | —                     |
| `GET`    | `/1/events/:eventId/roster-pool`                     | —                     |
| `POST`   | `/1/events/:eventId/roster-assignments`              | `MANAGE_SIGNUPS`      |
| `DELETE` | `/1/events/:eventId/roster-assignments/:characterId` | `MANAGE_SIGNUPS`      |
| `PUT`    | `/1/events/:eventId/roster-reorder`                  | `MANAGE_SIGNUPS`      |
| `POST`   | `/1/events/:eventId/roster-copy`                     | `MANAGE_SIGNUPS`      |
| `DELETE` | `/1/events/:eventId/roster-boss/:bossId`             | `MANAGE_SIGNUPS`      |
| `GET`    | `/1/events/:eventId/past-rosters`                    | —                     |
| `GET`    | `/1/events/:eventId/roster-replacements`             | `MANAGE_EVENT_ROSTER` |
| `POST`   | `/1/events/:eventId/roster-import`                   | `MANAGE_SIGNUPS`      |

### `/1/events` — module `boss_note`

| Méthode | Chemin                                  | Permission            |
| :------ | :-------------------------------------- | :-------------------- |
| `GET`   | `/1/events/:eventId/boss-notes`         | `SIGNUP_EVENT`        |
| `PUT`   | `/1/events/:eventId/boss-notes/:bossId` | `MANAGE_EVENT_ROSTER` |

### `/1/events` — module `composition`

| Méthode | Chemin                                    | Permission       |
| :------ | :---------------------------------------- | :--------------- |
| `GET`   | `/1/events/:eventId/composition-context`  | `MANAGE_SIGNUPS` |
| `POST`  | `/1/events/:eventId/generate-composition` | `MANAGE_SIGNUPS` |

### `/1/events` — module `event`

| Méthode  | Chemin                              | Permission       |
| :------- | :---------------------------------- | :--------------- |
| `GET`    | `/1/events`                         | —                |
| `GET`    | `/1/events/calendar-feed`           | —                |
| `POST`   | `/1/events/calendar-feed`           | —                |
| `DELETE` | `/1/events/calendar-feed`           | —                |
| `GET`    | `/1/events/calendar-feed/:file`     | —                |
| `POST`   | `/1/events/series`                  | `CREATE_EVENT`   |
| `PUT`    | `/1/events/series/:seriesId`        | `EDIT_EVENT`     |
| `DELETE` | `/1/events/series/:seriesId`        | `DELETE_EVENT`   |
| `GET`    | `/1/events/:id`                     | —                |
| `POST`   | `/1/events`                         | `CREATE_EVENT`   |
| `PUT`    | `/1/events/:id`                     | `EDIT_EVENT`     |
| `DELETE` | `/1/events/:id`                     | `DELETE_EVENT`   |
| `POST`   | `/1/events/:id/duplicate`           | `CREATE_EVENT`   |
| `GET`    | `/1/events/:eventId/no-status-tags` | `MANAGE_SIGNUPS` |

### `/1/absences` — module `absence`

| Méthode  | Chemin            | Permission     |
| :------- | :---------------- | :------------- |
| `GET`    | `/1/absences`     | —              |
| `GET`    | `/1/absences/:id` | —              |
| `POST`   | `/1/absences`     | `SIGNUP_EVENT` |
| `PUT`    | `/1/absences/:id` | `SIGNUP_EVENT` |
| `DELETE` | `/1/absences/:id` | `SIGNUP_EVENT` |

### `/1/dungeon-availability` — module `dungeon_availability`

| Méthode  | Chemin                        | Permission     |
| :------- | :---------------------------- | :------------- |
| `GET`    | `/1/dungeon-availability`     | —              |
| `GET`    | `/1/dungeon-availability/:id` | —              |
| `POST`   | `/1/dungeon-availability`     | `SIGNUP_EVENT` |
| `PUT`    | `/1/dungeon-availability/:id` | `SIGNUP_EVENT` |
| `DELETE` | `/1/dungeon-availability/:id` | `SIGNUP_EVENT` |

### `/1/dungeon-groups` — module `dungeon_group`

| Méthode  | Chemin                                  | Permission       |
| :------- | :-------------------------------------- | :--------------- |
| `GET`    | `/1/dungeon-groups`                     | —                |
| `GET`    | `/1/dungeon-groups/:id`                 | —                |
| `POST`   | `/1/dungeon-groups`                     | `MANAGE_SIGNUPS` |
| `PUT`    | `/1/dungeon-groups/:id`                 | `MANAGE_SIGNUPS` |
| `DELETE` | `/1/dungeon-groups/:id`                 | `MANAGE_SIGNUPS` |
| `POST`   | `/1/dungeon-groups/:id/members`         | `MANAGE_SIGNUPS` |
| `DELETE` | `/1/dungeon-groups/:id/members/:userId` | `MANAGE_SIGNUPS` |
| `POST`   | `/1/dungeon-groups/:id/guests`          | `MANAGE_SIGNUPS` |
| `PATCH`  | `/1/dungeon-groups/:id/guests/:guestId` | `MANAGE_SIGNUPS` |
| `DELETE` | `/1/dungeon-groups/:id/guests/:guestId` | `MANAGE_SIGNUPS` |

### `/1/enchantments` — module `enchantments`

| Méthode | Chemin                                | Permission |
| :------ | :------------------------------------ | :--------- |
| `GET`   | `/1/enchantments`                     | —          |
| `GET`   | `/1/enchantments/verify/bulk`         | —          |
| `GET`   | `/1/enchantments/verify/:characterId` | —          |

### `/1/items` — module `item`

| Méthode | Chemin             | Permission |
| :------ | :----------------- | :--------- |
| `GET`   | `/1/items/:itemId` | —          |

### `/1/validation_settings` — module `validation_settings`

| Méthode | Chemin                            | Permission     |
| :------ | :-------------------------------- | :------------- |
| `GET`   | `/1/validation_settings/:realmId` | `VIEW_ROSTER`  |
| `PUT`   | `/1/validation_settings/:realmId` | `MANAGE_REALM` |

### `/1/activity` — module `activity_log`

| Méthode | Chemin        | Permission          |
| :------ | :------------ | :------------------ |
| `GET`   | `/1/activity` | `VIEW_ACTIVITY_LOG` |

### `/1/extensions` — module `raid_items`

| Méthode | Chemin                                                 | Permission |
| :------ | :----------------------------------------------------- | :--------- |
| `GET`   | `/1/extensions/:extension/seasons/:season/items/:slot` | —          |

### `/admin` — module `admin`

| Méthode | Chemin                            | Permission |
| :------ | :-------------------------------- | :--------- |
| `GET`   | `/admin/stats`                    | —          |
| `GET`   | `/admin/realms`                   | —          |
| `GET`   | `/admin/realms/:id/characters`    | —          |
| `GET`   | `/admin/realms/:id/subscriptions` | —          |
| `POST`  | `/admin/realms/:id/subscriptions` | —          |

### `/1/invite` — module `invite`

| Méthode | Chemin                 | Permission |
| :------ | :--------------------- | :--------- |
| `GET`   | `/1/invite/:code`      | —          |
| `POST`  | `/1/invite/:code/join` | —          |

### `/1/attendance` — module `attendance`

| Méthode | Chemin                                 | Permission       |
| :------ | :------------------------------------- | :--------------- |
| `GET`   | `/1/attendance`                        | `MANAGE_SIGNUPS` |
| `GET`   | `/1/attendance/loot-equity`            | `ASSIGN_LOOT`    |
| `GET`   | `/1/attendance/character/:characterId` | `MANAGE_SIGNUPS` |

### `/1/auth` — module `device_auth`

| Méthode  | Chemin                             | Permission |
| :------- | :--------------------------------- | :--------- |
| `POST`   | `/1/auth/device/code`              | —          |
| `POST`   | `/1/auth/device/token`             | —          |
| `GET`    | `/1/auth/device/pending/:userCode` | —          |
| `POST`   | `/1/auth/device/approve`           | —          |
| `GET`    | `/1/auth/tokens`                   | —          |
| `DELETE` | `/1/auth/tokens/:id`               | —          |

### `/1/sync` — module `sync_loot`

| Méthode | Chemin         | Permission |
| :------ | :------------- | :--------- |
| `POST`  | `/1/sync/loot` | —          |

### `/1/attunements` — module `attunement`

| Méthode | Chemin                                               | Permission    |
| :------ | :--------------------------------------------------- | :------------ |
| `GET`   | `/1/attunements/definitions`                         | —             |
| `GET`   | `/1/attunements`                                     | `VIEW_ROSTER` |
| `PUT`   | `/1/attunements/characters/:characterId/:attunement` | `EDIT_ROSTER` |
