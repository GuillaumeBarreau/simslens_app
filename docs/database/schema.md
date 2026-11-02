# Référence des tables

> **Généré depuis `server/prisma/schema.prisma`** — ne pas éditer à la main.
> Le schéma est la source de vérité ; ce fichier n'en est que le reflet lisible.

Base **PostgreSQL 15**, accédée via Prisma. 55 tables.

## Index des tables

| Table                                                      | Nom SQL                       | Champs | Relations |
| :--------------------------------------------------------- | :---------------------------- | -----: | --------: |
| [`activity_logs`](#activitylogs)                           | `activity_logs`               |      7 |         1 |
| [`api_tokens`](#apitokens)                                 | `api_tokens`                  |      9 |         0 |
| [`boss_drop`](#bossdrop)                                   | `boss_drop`                   |      3 |         2 |
| [`bosses`](#bosses)                                        | `bosses`                      |      7 |         6 |
| [`calendar_feed_tokens`](#calendarfeedtokens)              | `calendar_feed_tokens`        |      5 |         0 |
| [`character_attunements`](#characterattunements)           | `character_attunements`       |      7 |         1 |
| [`character_gear_snapshots`](#charactergearsnapshots)      | `character_gear_snapshots`    |      8 |         3 |
| [`character_key_runs`](#characterkeyruns)                  | `character_key_runs`          |     12 |         1 |
| [`character_offspecs`](#characteroffspecs)                 | `character_offspecs`          |      4 |         2 |
| [`character_talent_loadouts`](#charactertalentloadouts)    | `character_talent_loadouts`   |      9 |         2 |
| [`character_wishlists`](#characterwishlists)               | `character_wishlists`         |      8 |         3 |
| [`characters`](#characters)                                | `characters`                  |     19 |        15 |
| [`classes`](#classes)                                      | `classes`                     |      2 |         2 |
| [`device_codes`](#devicecodes)                             | `device_codes`                |     10 |         0 |
| [`difficulties`](#difficulties)                            | `difficulties`                |      1 |         2 |
| [`dungeon_availabilities`](#dungeonavailabilities)         | `dungeon_availabilities`      |     11 |         1 |
| [`dungeon_group_guests`](#dungeongroupguests)              | `dungeon_group_guests`        |      9 |         1 |
| [`dungeon_group_members`](#dungeongroupmembers)            | `dungeon_group_members`       |      4 |         1 |
| [`dungeon_groups`](#dungeongroups)                         | `dungeon_groups`              |     11 |         3 |
| [`enchantments`](#enchantments)                            | `enchantments`                |     15 |         0 |
| [`event_boss_note_assignments`](#eventbossnoteassignments) | `event_boss_note_assignments` |      5 |         2 |
| [`event_boss_notes`](#eventbossnotes)                      | `event_boss_notes`            |      7 |         3 |
| [`event_roster_assignments`](#eventrosterassignments)      | `event_roster_assignments`    |      8 |         3 |
| [`gear_snapshot_items`](#gearsnapshotitems)                | `gear_snapshot_items`         |     18 |         2 |
| [`imported_loots`](#importedloots)                         | `imported_loots`              |     14 |         3 |
| [`imports`](#imports)                                      | `imports`                     |      7 |         2 |
| [`instance_bosses`](#instancebosses)                       | `instance_bosses`             |      5 |         2 |
| [`instance_loots`](#instanceloots)                         | `instance_loots`              |      8 |         4 |
| [`instances`](#instances)                                  | `instances`                   |     11 |         5 |
| [`item_bonus_data`](#itembonusdata)                        | `item_bonus_data`             |     16 |         0 |
| [`item_tokens`](#itemtokens)                               | `item_tokens`                 |      9 |         1 |
| [`items`](#items)                                          | `items`                       |      9 |         6 |
| [`loot_votes`](#lootvotes)                                 | `loot_votes`                  |      7 |         1 |
| [`member_absences`](#memberabsences)                       | `member_absences`             |      8 |         1 |
| [`raid_difficulties`](#raiddifficulties)                   | `raid_difficulties`           |      7 |         5 |
| [`raid_event_series`](#raideventseries)                    | `raid_event_series`           |     20 |         3 |
| [`raid_events`](#raidevents)                               | `raid_events`                 |     20 |         8 |
| [`raid_guest_assignments`](#raidguestassignments)          | `raid_guest_assignments`      |      5 |         2 |
| [`raid_guests`](#raidguests)                               | `raid_guests`                 |      8 |         3 |
| [`raid_signups`](#raidsignups)                             | `raid_signups`                |      8 |         3 |
| [`raids`](#raids)                                          | `raids`                       |      9 |         1 |
| [`realm_invite_codes`](#realminvitecodes)                  | `realm_invite_codes`          |      8 |         2 |
| [`realm_owners`](#realmowners)                             | `realm_owners`                |      4 |         1 |
| [`realm_subscriptions`](#realmsubscriptions)               | `realm_subscriptions`         |     10 |         1 |
| [`realm_user_guests`](#realmuserguests)                    | `realm_user_guests`           |      5 |         2 |
| [`realms`](#realms)                                        | `realms`                      |     14 |        16 |
| [`regions`](#regions)                                      | `regions`                     |      2 |         1 |
| [`servers`](#servers)                                      | `servers`                     |      6 |         3 |
| [`specializations`](#specializations)                      | `specializations`             |      7 |         8 |
| [`talent_hero_subtrees`](#talentherosubtrees)              | `talent_hero_subtrees`        |      4 |         2 |
| [`talent_nodes`](#talentnodes)                             | `talent_nodes`                |     10 |         2 |
| [`talent_trees`](#talenttrees)                             | `talent_trees`                |      5 |         3 |
| [`upgrades`](#upgrades)                                    | `upgrades`                    |     13 |         4 |
| [`validation_settings`](#validationsettings)               | `validation_settings`         |      9 |         1 |
| [`wow_items`](#wowitems)                                   | `wow_items`                   |     13 |         0 |

---

## `activity_logs`

| Champ           | Type       | Contraintes                | Note                                                                   |
| :-------------- | :--------- | :------------------------- | :--------------------------------------------------------------------- |
| `id`            | `Int`      | PK, défaut autoincrement() |                                                                        |
| `realmId`       | `Int`      | —                          |                                                                        |
| `userId`        | `String`   | —                          | Auth user ID                                                           |
| `characterName` | `String`   | —                          | Character name or filename for context (e.g. "Michel" or "report.csv") |
| `actionType`    | `String`   | —                          | "WISHLIST_UPDATE"                                                      | "SIM_REPORT_UPLOAD" |
| `metadata`      | `Json?`    | —                          | Extra context: oldItemId, newItemId, slot, difficulty, filename…       |
| `createdAt`     | `DateTime` | défaut now()               |                                                                        |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `index(realmId)`, `index(userId)`, `index(createdAt(sort:Desc))`

## `api_tokens`

| Champ        | Type        | Contraintes                | Note                                             |
| :----------- | :---------- | :------------------------- | :----------------------------------------------- |
| `id`         | `Int`       | PK, défaut autoincrement() |                                                  |
| `userId`     | `String`    | —                          | Battle.net user ID owning this token             |
| `name`       | `String`    | —                          | Human-readable label (e.g. "Desktop - HOSTNAME") |
| `tokenHash`  | `String`    | unique                     | SHA-256 of the raw token; raw value never stored |
| `scopes`     | `String[]`  | défaut []                  | e.g. ["realm:42", "sync:loot:write"]             |
| `createdAt`  | `DateTime`  | défaut now()               |                                                  |
| `lastUsedAt` | `DateTime?` | —                          |                                                  |
| `expiresAt`  | `DateTime?` | —                          |                                                  |
| `revokedAt`  | `DateTime?` | —                          |                                                  |

**Index** : `index(userId)`

## `boss_drop`

| Champ    | Type  | Contraintes                | Note |
| :------- | :---- | :------------------------- | :--- |
| `id`     | `Int` | PK, défaut autoincrement() |      |
| `bossId` | `Int` | —                          |      |
| `itemId` | `Int` | —                          |      |

**Relations**

- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`
- `item` → `items` — via `itemId`, onDelete: `Cascade`

**Index** : `index(bossId)`, `index(itemId)`

## `bosses`

| Champ       | Type      | Contraintes                | Note                                    |
| :---------- | :-------- | :------------------------- | :-------------------------------------- |
| `id`        | `Int`     | PK, défaut autoincrement() |                                         |
| `name`      | `String`  | —                          |                                         |
| `extension` | `String`  | —                          | "The-War-Within", "Midnight"            |
| `season`    | `String`  | —                          | "season-01", "season-02", "season-03"   |
| `raidName`  | `String?` | —                          | "Manaforge Omega", optional for clarity |
| `order`     | `Int`     | —                          |                                         |
| `icon`      | `String?` | —                          |                                         |

**Relations**

- `instance_bosses` → `instance_bosses`[]
- `loots` → `boss_drop`[]
- `instance_loots` → `instance_loots`[]
- `event_roster_assignments` → `event_roster_assignments`[]
- `guest_assignments` → `raid_guest_assignments`[]
- `boss_notes` → `event_boss_notes`[]

**Index** : `index(extension,season)`

## `calendar_feed_tokens`

| Champ        | Type        | Contraintes                | Note                                                    |
| :----------- | :---------- | :------------------------- | :------------------------------------------------------ |
| `id`         | `Int`       | PK, défaut autoincrement() |                                                         |
| `userId`     | `String`    | unique                     | Battle.net user ID : un seul flux actif par joueur      |
| `tokenHash`  | `String`    | unique                     | SHA-256 du jeton ; la valeur brute n'est jamais stockée |
| `createdAt`  | `DateTime`  | défaut now()               |                                                         |
| `lastUsedAt` | `DateTime?` | —                          |                                                         |

## `character_attunements`

| Champ            | Type        | Contraintes                | Note       |
| :--------------- | :---------- | :------------------------- | :--------- |
| `id`             | `Int`       | PK, défaut autoincrement() |            |
| `characterId`    | `Int`       | —                          |            |
| `attunement`     | `String`    | —                          |            |
| `faction`        | `String?`   | —                          | "alliance" | "horde" : la chaîne de quêtes en dépend |
| `completedSteps` | `Int`       | défaut 0                   |            |
| `completedAt`    | `DateTime?` | —                          |            |
| `updatedAt`      | `DateTime`  | —                          |            |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`

**Index** : `unique(characterId,attunement)`, `index(characterId)`

## `character_gear_snapshots`

| Champ              | Type       | Contraintes                | Note |
| :----------------- | :--------- | :------------------------- | :--- |
| `id`               | `Int`      | PK, défaut autoincrement() |      |
| `characterId`      | `Int`      | —                          |      |
| `reportId`         | `String`   | —                          |      |
| `spec`             | `String`   | —                          |      |
| `specializationId` | `Int?`     | —                          |      |
| `difficulty`       | `String`   | —                          |      |
| `timestamp`        | `DateTime` | —                          |      |
| `createdAt`        | `DateTime` | défaut now()               |      |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `SetNull`
- `items` → `gear_snapshot_items`[]

**Index** : `index(characterId)`, `index(specializationId)`, `index(reportId)`, `index(timestamp)`

## `character_key_runs`

| Champ           | Type       | Contraintes                | Note |
| :-------------- | :--------- | :------------------------- | :--- |
| `id`            | `Int`      | PK, défaut autoincrement() |      |
| `characterId`   | `Int`      | —                          |      |
| `dungeon`       | `String`   | —                          |      |
| `shortName`     | `String?`  | —                          |      |
| `keystoneLevel` | `Int`      | —                          |      |
| `completedAt`   | `DateTime` | —                          |      |
| `score`         | `Float?`   | —                          |      |
| `numUpgrades`   | `Int?`     | —                          |      |
| `clearTimeMs`   | `Int?`     | —                          |      |
| `parTimeMs`     | `Int?`     | —                          |      |
| `raiderIoUrl`   | `String?`  | —                          |      |
| `createdAt`     | `DateTime` | défaut now()               |      |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`

**Index** : `unique(characterId,dungeon,completedAt)`, `index(characterId)`, `index(completedAt)`, `index(characterId,completedAt)`

## `character_offspecs`

| Champ              | Type       | Contraintes                | Note |
| :----------------- | :--------- | :------------------------- | :--- |
| `id`               | `Int`      | PK, défaut autoincrement() |      |
| `characterId`      | `Int`      | —                          |      |
| `specializationId` | `Int`      | —                          |      |
| `createdAt`        | `DateTime` | défaut now()               |      |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `Cascade`

**Index** : `unique(characterId,specializationId)`, `index(specializationId)`

## `character_talent_loadouts`

| Champ              | Type       | Contraintes                | Note                                                         |
| :----------------- | :--------- | :------------------------- | :----------------------------------------------------------- |
| `id`               | `Int`      | PK, défaut autoincrement() |                                                              |
| `characterId`      | `Int`      | —                          |                                                              |
| `specializationId` | `Int`      | —                          |                                                              |
| `label`            | `String?`  | —                          | nom du loadout (optionnel)                                   |
| `selectedNodes`    | `Json`     | —                          | { [blizzardNodeId]: { rank: number, choiceIndex?: number } } |
| `exportString`     | `String?`  | —                          | code d'import/export WoW                                     |
| `source`           | `String`   | défaut "manual"            | "manual"                                                     | "blizzard" |
| `createdAt`        | `DateTime` | défaut now()               |                                                              |
| `updatedAt`        | `DateTime` | —                          |                                                              |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `Restrict`

**Index** : `unique(characterId,specializationId)`, `index(characterId)`, `index(specializationId)`

## `character_wishlists`

| Champ              | Type       | Contraintes                | Note                             |
| :----------------- | :--------- | :------------------------- | :------------------------------- |
| `id`               | `Int`      | PK, défaut autoincrement() |                                  |
| `characterId`      | `Int`      | —                          |                                  |
| `specializationId` | `Int`      | —                          |                                  |
| `slot`             | `String`   | —                          | "head", "neck", "shoulder", etc. |
| `itemId`           | `Int?`     | —                          | NULL if no item selected         |
| `priority`         | `Int?`     | défaut 0                   | 0 = no priority, 1-3 = priority  |
| `createdAt`        | `DateTime` | défaut now()               |                                  |
| `updatedAt`        | `DateTime` | —                          |                                  |

**Relations**

- `character` → `characters` — via `characterId`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `Restrict`
- `item` → `items` — via `itemId`, onDelete: `SetNull`

**Index** : `unique(characterId,specializationId,slot)`, `index(characterId)`, `index(specializationId)`, `index(itemId)`

## `characters`

| Champ                   | Type        | Contraintes                | Note                        |
| :---------------------- | :---------- | :------------------------- | :-------------------------- |
| `id`                    | `Int`       | PK, défaut autoincrement() |                             |
| `lastModified`          | `DateTime`  | —                          |                             |
| `name`                  | `String`    | —                          |                             |
| `class`                 | `String`    | —                          |                             |
| `realm`                 | `String`    | —                          |                             |
| `region`                | `String?`   | défaut "EU"                |                             |
| `thumbnail`             | `String?`   | —                          |                             |
| `archived`              | `Int?`      | défaut 0                   |                             |
| `archivedAt`            | `DateTime?` | —                          |                             |
| `status`                | `String`    | défaut "approved"          | pending, approved, archived |
| `spec`                  | `String?`   | —                          |                             |
| `specializationId`      | `Int?`      | —                          |                             |
| `currentPeriodKeyCount` | `Int?`      | défaut 0                   |                             |
| `ManaforgeBuff`         | `String?`   | —                          |                             |
| `ilvl`                  | `Int?`      | —                          |                             |
| `score`                 | `Int?`      | —                          |                             |
| `discordTag`            | `String?`   | —                          |                             |
| `realmId`               | `Int?`      | —                          |                             |
| `userId`                | `String?`   | —                          |                             |

**Relations**

- `realmRelation` → `realms` — via `realmId`, onDelete: `SetNull`
- `classes` → `classes` — via `class`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `SetNull`
- `imported_loots_imported_loots_ownerTocharacters` → `imported_loots`[]
- `imported_loots_imported_loots_characterIDTocharacters` → `imported_loots`[]
- `upgrades` → `upgrades`[]
- `wishlists` → `character_wishlists`[]
- `talent_loadouts` → `character_talent_loadouts`[]
- `raid_signups` → `raid_signups`[]
- `gear_snapshots` → `character_gear_snapshots`[]
- `event_roster_assignments` → `event_roster_assignments`[]
- `key_runs` → `character_key_runs`[]
- `boss_note_assignments` → `event_boss_note_assignments`[]
- `offspecs` → `character_offspecs`[]
- `attunements` → `character_attunements`[]

**Index** : `unique(name,realm)`, `index(archived)`, `index(realmId)`, `index(userId)`, `index(specializationId)`

## `classes`

| Champ  | Type     | Contraintes                | Note |
| :----- | :------- | :------------------------- | :--- |
| `id`   | `Int`    | PK, défaut autoincrement() |      |
| `name` | `String` | unique                     |      |

**Relations**

- `characters` → `characters`[]
- `specializations` → `specializations`[]

## `device_codes`

| Champ        | Type        | Contraintes                | Note                                               |
| :----------- | :---------- | :------------------------- | :------------------------------------------------- |
| `id`         | `Int`       | PK, défaut autoincrement() |                                                    |
| `deviceCode` | `String`    | unique                     | Long opaque secret polled by the device            |
| `userCode`   | `String`    | unique                     | Short human-readable code displayed to the user    |
| `userId`     | `String?`   | —                          | Set once the user approves (Battle.net ID)         |
| `scopes`     | `String[]`  | défaut []                  |                                                    |
| `deviceName` | `String?`   | —                          | Hostname / label proposed by the device            |
| `expiresAt`  | `DateTime`  | —                          | Hard expiry of the request (~15 min)               |
| `approvedAt` | `DateTime?` | —                          | When the user approved the request                 |
| `consumedAt` | `DateTime?` | —                          | When the device successfully exchanged for a token |
| `createdAt`  | `DateTime`  | défaut now()               |                                                    |

**Index** : `index(userCode)`

## `difficulties`

| Champ  | Type     | Contraintes | Note |
| :----- | :------- | :---------- | :--- |
| `name` | `String` | PK          |      |

**Relations**

- `upgrades` → `upgrades`[]
- `raid_difficulties` → `raid_difficulties`[]

## `dungeon_availabilities`

| Champ       | Type       | Contraintes                | Note                                |
| :---------- | :--------- | :------------------------- | :---------------------------------- |
| `id`        | `Int`      | PK, défaut autoincrement() |                                     |
| `userId`    | `String`   | —                          |                                     |
| `realmId`   | `Int`      | —                          |                                     |
| `date`      | `DateTime` | —                          |                                     |
| `startTime` | `String`   | —                          | "20:00"                             |
| `endTime`   | `String`   | —                          | "23:00"                             |
| `type`      | `String`   | —                          | "M0" or "M+"                        |
| `roles`     | `String`   | —                          | JSON array: ["TANK","HEALER","DPS"] |
| `note`      | `String?`  | —                          |                                     |
| `createdAt` | `DateTime` | défaut now()               |                                     |
| `updatedAt` | `DateTime` | —                          |                                     |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `index(userId)`, `index(realmId)`, `index(date)`

## `dungeon_group_guests`

| Champ       | Type       | Contraintes                | Note                                          |
| :---------- | :--------- | :------------------------- | :-------------------------------------------- |
| `id`        | `Int`      | PK, défaut autoincrement() |                                               |
| `groupId`   | `Int`      | —                          |                                               |
| `realmId`   | `Int`      | —                          |                                               |
| `name`      | `String`   | —                          |                                               |
| `role`      | `String`   | —                          | TANK, HEALER, DPS                             |
| `class`     | `String?`  | —                          |                                               |
| `addedBy`   | `String?`  | —                          |                                               |
| `slotId`    | `String?`  | —                          | e.g. 'slot-TANK', 'slot-HEALER', 'slot-DPS-0' |
| `createdAt` | `DateTime` | défaut now()               |                                               |

**Relations**

- `group` → `dungeon_groups` — via `groupId`, onDelete: `Cascade`

**Index** : `index(groupId)`

## `dungeon_group_members`

| Champ     | Type     | Contraintes                | Note              |
| :-------- | :------- | :------------------------- | :---------------- |
| `id`      | `Int`    | PK, défaut autoincrement() |                   |
| `groupId` | `Int`    | —                          |                   |
| `userId`  | `String` | —                          |                   |
| `role`    | `String` | —                          | TANK, HEALER, DPS |

**Relations**

- `group` → `dungeon_groups` — via `groupId`, onDelete: `Cascade`

**Index** : `index(groupId)`

## `dungeon_groups`

| Champ       | Type       | Contraintes                | Note             |
| :---------- | :--------- | :------------------------- | :--------------- |
| `id`        | `Int`      | PK, défaut autoincrement() |                  |
| `realmId`   | `Int`      | —                          |                  |
| `date`      | `DateTime` | —                          |                  |
| `startTime` | `String`   | —                          |                  |
| `endTime`   | `String`   | —                          |                  |
| `type`      | `String`   | —                          | "M0" or "M+"     |
| `note`      | `String?`  | —                          |                  |
| `status`    | `String`   | défaut "DRAFT"             | DRAFT, CONFIRMED |
| `createdBy` | `String`   | —                          |                  |
| `createdAt` | `DateTime` | défaut now()               |                  |
| `updatedAt` | `DateTime` | —                          |                  |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `members` → `dungeon_group_members`[]
- `guests` → `dungeon_group_guests`[]

**Index** : `index(realmId)`, `index(date)`

## `enchantments`

| Champ             | Type      | Contraintes | Note |
| :---------------- | :-------- | :---------- | :--- |
| `id`              | `Int`     | PK          |      |
| `displayName`     | `String`  | —           |      |
| `tokenizedName`   | `String`  | —           |      |
| `spellId`         | `Int?`    | —           |      |
| `spellIcon`       | `String?` | —           |      |
| `itemId`          | `Int?`    | —           |      |
| `itemIcon`        | `String?` | —           |      |
| `quality`         | `Int?`    | —           |      |
| `expansion`       | `Int?`    | —           |      |
| `craftingQuality` | `Int?`    | —           |      |
| `slot`            | `String?` | —           |      |
| `socketType`      | `String?` | —           |      |
| `categoryId`      | `Int?`    | —           |      |
| `categoryName`    | `String?` | —           |      |
| `stats`           | `Json?`   | —           |      |

**Index** : `index(spellId)`, `index(itemId)`, `index(categoryId)`

## `event_boss_note_assignments`

| Champ         | Type     | Contraintes                | Note |
| :------------ | :------- | :------------------------- | :--- |
| `id`          | `Int`    | PK, défaut autoincrement() |      |
| `noteId`      | `Int`    | —                          |      |
| `characterId` | `Int`    | —                          |      |
| `task`        | `String` | —                          |      |
| `position`    | `Int`    | défaut 0                   |      |

**Relations**

- `note` → `event_boss_notes` — via `noteId`, onDelete: `Cascade`
- `character` → `characters` — via `characterId`, onDelete: `Cascade`

**Index** : `index(noteId)`, `index(characterId)`

## `event_boss_notes`

| Champ       | Type       | Contraintes                | Note                                      |
| :---------- | :--------- | :------------------------- | :---------------------------------------- |
| `id`        | `Int`      | PK, défaut autoincrement() |                                           |
| `eventId`   | `Int`      | —                          |                                           |
| `bossId`    | `Int`      | —                          |                                           |
| `content`   | `String`   | défaut ""                  | Markdown, rendu côté front sans HTML brut |
| `updatedBy` | `String?`  | —                          | Battle.net user ID of the last editor     |
| `createdAt` | `DateTime` | défaut now()               |                                           |
| `updatedAt` | `DateTime` | —                          |                                           |

**Relations**

- `event` → `raid_events` — via `eventId`, onDelete: `Cascade`
- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`
- `assignments` → `event_boss_note_assignments`[]

**Index** : `unique(eventId,bossId)`, `index(eventId)`

## `event_roster_assignments`

| Champ         | Type       | Contraintes                | Note              |
| :------------ | :--------- | :------------------------- | :---------------- |
| `id`          | `Int`      | PK, défaut autoincrement() |                   |
| `eventId`     | `Int`      | —                          |                   |
| `characterId` | `Int`      | —                          |                   |
| `bossId`      | `Int?`     | —                          |                   |
| `role`        | `String`   | —                          | TANK, HEALER, DPS |
| `position`    | `Int`      | défaut 0                   |                   |
| `createdAt`   | `DateTime` | défaut now()               |                   |
| `updatedAt`   | `DateTime` | —                          |                   |

**Relations**

- `event` → `raid_events` — via `eventId`, onDelete: `Cascade`
- `character` → `characters` — via `characterId`, onDelete: `Cascade`
- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`

**Index** : `unique(eventId,characterId,bossId)`, `index(eventId)`, `index(characterId)`

## `gear_snapshot_items`

| Champ              | Type      | Contraintes                | Note                                     |
| :----------------- | :-------- | :------------------------- | :--------------------------------------- |
| `id`               | `Int`     | PK, défaut autoincrement() |                                          |
| `snapshotId`       | `Int`     | —                          |                                          |
| `slot`             | `String`  | —                          |                                          |
| `itemId`           | `Int`     | —                          |                                          |
| `ilevel`           | `Int`     | —                          |                                          |
| `encodedItem`      | `String`  | —                          |                                          |
| `enchantId`        | `Int?`    | —                          |                                          |
| `gemIds`           | `String?` | —                          |                                          |
| `upgradeLevel`     | `Int?`    | —                          | Current upgrade level (e.g., 8)          |
| `upgradeMax`       | `Int?`    | —                          | Maximum upgrade level (e.g., 8)          |
| `upgradeName`      | `String?` | —                          | Track name (e.g., "Myth")                |
| `upgradeFullName`  | `String?` | —                          | Full display name (e.g., "Myth 8/8")     |
| `upgradeBonusId`   | `Int?`    | —                          | Bonus ID for the upgrade                 |
| `upgradeItemLevel` | `Int?`    | —                          | Item level with upgrade applied          |
| `upgradeGroup`     | `Int?`    | —                          | Upgrade group ID                         |
| `baseItemLevel`    | `Int?`    | —                          | Base ilvl before upgrades                |
| `itemSource`       | `String?` | —                          | "raid", "craft", "other"                 |
| `craftingQuality`  | `Int?`    | —                          | Crafting quality (1-5) for crafted items |

**Relations**

- `snapshot` → `character_gear_snapshots` — via `snapshotId`, onDelete: `Cascade`
- `item` → `items` — via `itemId`, onDelete: `Cascade`

**Index** : `index(snapshotId)`, `index(itemId)`

## `imported_loots`

| Champ                     | Type        | Contraintes                | Note |
| :------------------------ | :---------- | :------------------------- | :--- |
| `id`                      | `Int`       | PK, défaut autoincrement() |      |
| `importID`                | `Int`       | —                          |      |
| `characterID`             | `Int?`      | —                          |      |
| `player`                  | `String?`   | —                          |      |
| `date`                    | `String?`   | —                          |      |
| `time`                    | `String?`   | —                          |      |
| `itemID`                  | `Int?`      | —                          |      |
| `response`                | `String?`   | —                          |      |
| `instance`                | `String?`   | —                          |      |
| `owner`                   | `Int?`      | —                          |      |
| `upgradePercent`          | `Decimal?`  | —                          |      |
| `upgradeSimAt`            | `DateTime?` | —                          |      |
| `upgradeSpecializationId` | `Int?`      | —                          |      |
| `upgradeMetric`           | `String?`   | —                          |      |

**Relations**

- `characters_imported_loots_ownerTocharacters` → `characters` — via `owner`
- `characters_imported_loots_characterIDTocharacters` → `characters` — via `characterID`
- `imports` → `imports` — via `importID`, onDelete: `Cascade`

**Index** : `unique(player,date,time,itemID)`

## `imports`

| Champ        | Type      | Contraintes                | Note |
| :----------- | :-------- | :------------------------- | :--- |
| `id`         | `Int`     | PK, défaut autoincrement() |      |
| `filename`   | `String`  | —                          |      |
| `importedAt` | `Int`     | —                          |      |
| `rowCount`   | `Int`     | —                          |      |
| `extension`  | `String?` | —                          |      |
| `season`     | `String?` | —                          |      |
| `instanceId` | `Int?`    | —                          |      |

**Relations**

- `imported_loots` → `imported_loots`[]
- `instance` → `instances` — via `instanceId`, onDelete: `SetNull`

**Index** : `index(extension,season)`

## `instance_bosses`

| Champ        | Type        | Contraintes                | Note |
| :----------- | :---------- | :------------------------- | :--- |
| `id`         | `Int`       | PK, défaut autoincrement() |      |
| `instanceId` | `Int`       | —                          |      |
| `bossId`     | `Int`       | —                          |      |
| `killed`     | `Boolean`   | défaut false               |      |
| `killedAt`   | `DateTime?` | —                          |      |

**Relations**

- `instance` → `instances` — via `instanceId`, onDelete: `Cascade`
- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`

**Index** : `unique(instanceId,bossId)`, `index(instanceId)`, `index(bossId)`

## `instance_loots`

| Champ        | Type        | Contraintes                | Note |
| :----------- | :---------- | :------------------------- | :--- |
| `id`         | `Int`       | PK, défaut autoincrement() |      |
| `instanceId` | `Int`       | —                          |      |
| `bossId`     | `Int`       | —                          |      |
| `itemId`     | `Int`       | —                          |      |
| `assignedTo` | `Int?`      | —                          |      |
| `assignedBy` | `Int?`      | —                          |      |
| `assignedAt` | `DateTime?` | —                          |      |
| `createdAt`  | `DateTime`  | défaut now()               |      |

**Relations**

- `instance` → `instances` — via `instanceId`, onDelete: `Cascade`
- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`
- `item` → `items` — via `itemId`, onDelete: `Cascade`
- `votes` → `loot_votes`[]

**Index** : `index(instanceId)`, `index(bossId)`, `index(itemId)`

## `instances`

| Champ              | Type       | Contraintes                | Note |
| :----------------- | :--------- | :------------------------- | :--- |
| `id`               | `Int`      | PK, défaut autoincrement() |      |
| `name`             | `String`   | —                          |      |
| `date`             | `DateTime` | —                          |      |
| `raidDifficultyId` | `Int`      | —                          |      |
| `realmId`          | `Int`      | —                          |      |
| `createdBy`        | `Int`      | —                          |      |
| `status`           | `String`   | défaut "ONGOING"           |      |
| `bossesKilled`     | `Int`      | défaut 0                   |      |
| `totalBosses`      | `Int?`     | —                          |      |
| `createdAt`        | `DateTime` | défaut now()               |      |
| `updatedAt`        | `DateTime` | —                          |      |

**Relations**

- `raid_difficulty` → `raid_difficulties` — via `raidDifficultyId`, onDelete: `Cascade`
- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `instance_bosses` → `instance_bosses`[]
- `instance_loots` → `instance_loots`[]
- `imports` → `imports`[]

**Index** : `index(realmId)`, `index(raidDifficultyId)`

## `item_bonus_data`

| Champ              | Type       | Contraintes  | Note |
| :----------------- | :--------- | :----------- | :--- |
| `id`               | `Int`      | PK           |      |
| `upgradeGroup`     | `Int?`     | —            |      |
| `upgradeLevel`     | `Int?`     | —            |      |
| `upgradeMax`       | `Int?`     | —            |      |
| `upgradeName`      | `String?`  | —            |      |
| `upgradeFullName`  | `String?`  | —            |      |
| `upgradeItemLevel` | `Int?`     | —            |      |
| `upgradeSeasonId`  | `Int?`     | —            |      |
| `upgradePriority`  | `Int?`     | défaut 0     |      |
| `quality`          | `Int?`     | —            |      |
| `levelModifier`    | `Int?`     | —            |      |
| `tag`              | `String?`  | —            |      |
| `rawStats`         | `Json?`    | —            |      |
| `statsDescription` | `String?`  | —            |      |
| `createdAt`        | `DateTime` | défaut now() |      |
| `updatedAt`        | `DateTime` | —            |      |

**Index** : `index(upgradeGroup)`, `index(upgradePriority(sort:Desc))`, `index(upgradeSeasonId)`

## `item_tokens`

| Champ          | Type      | Contraintes                | Note |
| :------------- | :-------- | :------------------------- | :--- |
| `id`           | `Int`     | PK, défaut autoincrement() |      |
| `tokenItemId`  | `Int`     | —                          |      |
| `rewardItemId` | `Int`     | —                          |      |
| `class`        | `String`  | —                          |      |
| `armorType`    | `String?` | —                          |      |
| `slot`         | `String`  | —                          |      |
| `tokenType`    | `String`  | —                          |      |
| `extension`    | `String`  | défaut ""                  |      |
| `season`       | `String`  | défaut ""                  |      |

**Relations**

- `item` → `items` — via `rewardItemId`, onDelete: `Cascade`

**Index** : `index(rewardItemId)`, `index(extension,season)`

## `items`

| Champ              | Type      | Contraintes                | Note |
| :----------------- | :-------- | :------------------------- | :--- |
| `id`               | `Int`     | PK, défaut autoincrement() |      |
| `name`             | `String`  | —                          |      |
| `icon`             | `String`  | —                          |      |
| `quality`          | `Int`     | —                          |      |
| `itemLevel`        | `Int`     | —                          |      |
| `inventoryType`    | `Int?`    | —                          |      |
| `itemClass`        | `Int?`    | —                          |      |
| `itemSubClass`     | `Int?`    | —                          |      |
| `allowableClasses` | `String?` | —                          |      |

**Relations**

- `upgrades` → `upgrades`[]
- `boss_drop` → `boss_drop`[]
- `instance_loots` → `instance_loots`[]
- `wishlists` → `character_wishlists`[]
- `tokens` → `item_tokens`[]
- `gear_snapshots` → `gear_snapshot_items`[]

## `loot_votes`

| Champ       | Type       | Contraintes                | Note                                            |
| :---------- | :--------- | :------------------------- | :---------------------------------------------- |
| `id`        | `Int`      | PK, défaut autoincrement() |                                                 |
| `lootId`    | `Int`      | —                          |                                                 |
| `playerId`  | `Int`      | —                          |                                                 |
| `choice`    | `String`   | —                          | 'BiS', 'Upgrade', 'Offspec', 'Transmog', 'Pass' |
| `comment`   | `String?`  | —                          |                                                 |
| `createdAt` | `DateTime` | défaut now()               |                                                 |
| `updatedAt` | `DateTime` | —                          |                                                 |

**Relations**

- `loot` → `instance_loots` — via `lootId`, onDelete: `Cascade`

**Index** : `unique(lootId,playerId)`, `index(lootId)`, `index(playerId)`

## `member_absences`

| Champ       | Type       | Contraintes                | Note |
| :---------- | :--------- | :------------------------- | :--- |
| `id`        | `Int`      | PK, défaut autoincrement() |      |
| `userId`    | `String`   | —                          |      |
| `realmId`   | `Int`      | —                          |      |
| `startDate` | `DateTime` | —                          |      |
| `endDate`   | `DateTime` | —                          |      |
| `reason`    | `String?`  | —                          |      |
| `createdAt` | `DateTime` | défaut now()               |      |
| `updatedAt` | `DateTime` | —                          |      |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `unique(userId,realmId,startDate)`, `index(userId)`, `index(realmId)`, `index(startDate,endDate)`

## `raid_difficulties`

| Champ                | Type      | Contraintes                | Note |
| :------------------- | :-------- | :------------------------- | :--- |
| `id`                 | `Int`     | PK, défaut autoincrement() |      |
| `raidId`             | `Int`     | —                          |      |
| `difficulty`         | `String`  | —                          |      |
| `description`        | `String?` | —                          |      |
| `image_button`       | `String?` | —                          |      |
| `image_button_small` | `String?` | —                          |      |
| `image_background`   | `String?` | —                          |      |

**Relations**

- `raid` → `raids` — via `raidId`, onDelete: `Cascade`
- `difficulty_rel` → `difficulties` — via `difficulty`, onDelete: `Restrict`
- `instances` → `instances`[]
- `raid_events` → `raid_events`[]
- `raid_event_series` → `raid_event_series`[]

**Index** : `unique(raidId,difficulty)`, `index(raidId)`, `index(difficulty)`

## `raid_event_series`

| Champ                | Type        | Contraintes                | Note |
| :------------------- | :---------- | :------------------------- | :--- |
| `id`                 | `Int`       | PK, défaut autoincrement() |      |
| `realmId`            | `Int`       | —                          |      |
| `title`              | `String`    | —                          |      |
| `description`        | `String?`   | —                          |      |
| `raidDifficultyId`   | `Int?`      | —                          |      |
| `dayOfWeek`          | `Int`       | —                          |      |
| `startTime`          | `String`    | —                          |      |
| `endTime`            | `String`    | —                          |      |
| `timezone`           | `String`    | défaut "Europe/Paris"      |      |
| `weeksAhead`         | `Int`       | défaut 4                   |      |
| `isOptional`         | `Boolean`   | défaut false               |      |
| `defaultPresent`     | `Boolean`   | défaut false               |      |
| `signupLockDisabled` | `Boolean`   | défaut false               |      |
| `active`             | `Boolean`   | défaut true                |      |
| `startsOn`           | `DateTime`  | —                          |      |
| `endsOn`             | `DateTime?` | —                          |      |
| `generatedUntil`     | `DateTime?` | —                          |      |
| `createdBy`          | `String`    | —                          |      |
| `createdAt`          | `DateTime`  | défaut now()               |      |
| `updatedAt`          | `DateTime`  | —                          |      |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `raid_difficulty` → `raid_difficulties` — via `raidDifficultyId`, onDelete: `SetNull`
- `events` → `raid_events`[]

**Index** : `index(realmId)`, `index(active)`

## `raid_events`

| Champ                   | Type        | Contraintes                | Note |
| :---------------------- | :---------- | :------------------------- | :--- |
| `id`                    | `Int`       | PK, défaut autoincrement() |      |
| `title`                 | `String`    | —                          |      |
| `description`           | `String?`   | —                          |      |
| `startTime`             | `DateTime`  | —                          |      |
| `endTime`               | `DateTime`  | —                          |      |
| `raidDifficultyId`      | `Int?`      | —                          |      |
| `realmId`               | `Int`       | —                          |      |
| `discordEventId`        | `String?`   | —                          |      |
| `discordChannelId`      | `String?`   | —                          |      |
| `discordMessageId`      | `String?`   | —                          |      |
| `createdBy`             | `String`    | —                          |      |
| `createdAt`             | `DateTime`  | défaut now()               |      |
| `updatedAt`             | `DateTime`  | —                          |      |
| `isOptional`            | `Boolean`   | défaut false               |      |
| `defaultPresent`        | `Boolean`   | défaut false               |      |
| `signupLockDisabled`    | `Boolean`   | défaut false               |      |
| `reminderSentAt`        | `DateTime?` | —                          |      |
| `confirmReminderSentAt` | `DateTime?` | —                          |      |
| `seriesId`              | `Int?`      | —                          |      |
| `seriesOccurrenceDate`  | `DateTime?` | —                          |      |

**Relations**

- `status` → `EventStatus`
- `raid_difficulty` → `raid_difficulties` — via `raidDifficultyId`, onDelete: `SetNull`
- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `series` → `raid_event_series` — via `seriesId`, onDelete: `SetNull`
- `signups` → `raid_signups`[]
- `guests` → `raid_guests`[]
- `event_roster_assignments` → `event_roster_assignments`[]
- `boss_notes` → `event_boss_notes`[]

**Index** : `unique(seriesId,seriesOccurrenceDate)`, `index(realmId)`, `index(raidDifficultyId)`, `index(startTime)`, `index(status)`

## `raid_guest_assignments`

| Champ       | Type       | Contraintes                | Note |
| :---------- | :--------- | :------------------------- | :--- |
| `id`        | `Int`      | PK, défaut autoincrement() |      |
| `guestId`   | `Int`      | —                          |      |
| `bossId`    | `Int`      | —                          |      |
| `role`      | `String`   | —                          | TANK | HEALER | MELEE | RANGED |
| `createdAt` | `DateTime` | défaut now()               |      |

**Relations**

- `guest` → `raid_guests` — via `guestId`, onDelete: `Cascade`
- `boss` → `bosses` — via `bossId`, onDelete: `Cascade`

**Index** : `unique(guestId,bossId)`

## `raid_guests`

| Champ       | Type       | Contraintes                | Note                                                    |
| :---------- | :--------- | :------------------------- | :------------------------------------------------------ |
| `id`        | `Int`      | PK, défaut autoincrement() |                                                         |
| `eventId`   | `Int`      | —                          |                                                         |
| `realmId`   | `Int`      | —                          |                                                         |
| `name`      | `String`   | —                          | Display name (e.g. "Ghostbane")                         |
| `role`      | `String`   | —                          | TANK                                                    | HEALER | MELEE | RANGED (default role) |
| `class`     | `String?`  | —                          | WoW class (e.g. "warrior", "death_knight")              |
| `addedBy`   | `String?`  | —                          | Discord tag or userId of the person who added the guest |
| `createdAt` | `DateTime` | défaut now()               |                                                         |

**Relations**

- `event` → `raid_events` — via `eventId`, onDelete: `Cascade`
- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `assignments` → `raid_guest_assignments`[]

**Index** : `index(eventId)`

## `raid_signups`

| Champ           | Type       | Contraintes                | Note              |
| :-------------- | :--------- | :------------------------- | :---------------- |
| `id`            | `Int`      | PK, défaut autoincrement() |                   |
| `eventId`       | `Int`      | —                          |                   |
| `characterId`   | `Int`      | —                          |                   |
| `role`          | `String?`  | —                          | TANK, HEALER, DPS |
| `lateTime`      | `String?`  | —                          | e.g., "21:30"     |
| `absenceReason` | `String?`  | —                          |                   |
| `createdAt`     | `DateTime` | défaut now()               |                   |
| `updatedAt`     | `DateTime` | —                          |                   |

**Relations**

- `status` → `SignupStatus`
- `event` → `raid_events` — via `eventId`, onDelete: `Cascade`
- `character` → `characters` — via `characterId`, onDelete: `Cascade`

**Index** : `unique(eventId,characterId)`, `index(eventId)`, `index(characterId)`

## `raids`

| Champ                | Type      | Contraintes                | Note |
| :------------------- | :-------- | :------------------------- | :--- |
| `id`                 | `Int`     | PK, défaut autoincrement() |      |
| `name`               | `String`  | unique                     |      |
| `instanceId`         | `Int?`    | unique                     |      |
| `description`        | `String?` | —                          |      |
| `image_button`       | `String?` | —                          |      |
| `image_button_small` | `String?` | —                          |      |
| `image_background`   | `String?` | —                          |      |
| `extension`          | `String?` | —                          |      |
| `season`             | `String?` | —                          |      |

**Relations**

- `raid_difficulties` → `raid_difficulties`[]

## `realm_invite_codes`

| Champ       | Type        | Contraintes                | Note                             |
| :---------- | :---------- | :------------------------- | :------------------------------- |
| `id`        | `Int`       | PK, défaut autoincrement() |                                  |
| `realmId`   | `Int`       | —                          |                                  |
| `code`      | `String`    | unique                     |                                  |
| `createdBy` | `String`    | —                          | Battle.net userId of the creator |
| `expiresAt` | `DateTime?` | —                          |                                  |
| `maxUses`   | `Int`       | défaut 1                   |                                  |
| `useCount`  | `Int`       | défaut 0                   |                                  |
| `createdAt` | `DateTime`  | défaut now()               |                                  |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `guests` → `realm_user_guests`[]

**Index** : `index(realmId)`, `index(code)`

## `realm_owners`

| Champ     | Type     | Contraintes                | Note                          |
| :-------- | :------- | :------------------------- | :---------------------------- |
| `id`      | `Int`    | PK, défaut autoincrement() |                               |
| `realmId` | `Int`    | —                          |                               |
| `ownerId` | `String` | —                          |                               |
| `role`    | `String` | défaut "admin"             | "owner", "admin", "moderator" |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `unique(realmId,ownerId)`, `index(ownerId)`, `index(realmId)`

## `realm_subscriptions`

| Champ       | Type       | Contraintes                | Note      |
| :---------- | :--------- | :------------------------- | :-------- |
| `id`        | `Int`      | PK, défaut autoincrement() |           |
| `realmId`   | `Int`      | —                          |           |
| `tier`      | `Int`      | —                          |           |
| `type`      | `String`   | —                          | "monthly" | "annual"  |
| `status`    | `String`   | défaut "active"            | "active"  | "expired" | "cancelled" |
| `price`     | `Decimal`  | —                          |           |
| `startedAt` | `DateTime` | défaut now()               |           |
| `expiresAt` | `DateTime` | —                          |           |
| `note`      | `String?`  | —                          |           |
| `createdAt` | `DateTime` | défaut now()               |           |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `index(realmId)`, `index(status)`, `index(expiresAt)`

## `realm_user_guests`

| Champ          | Type       | Contraintes                | Note              |
| :------------- | :--------- | :------------------------- | :---------------- |
| `id`           | `Int`      | PK, défaut autoincrement() |                   |
| `realmId`      | `Int`      | —                          |                   |
| `userId`       | `String`   | —                          | Battle.net userId |
| `inviteCodeId` | `Int?`     | —                          |                   |
| `joinedAt`     | `DateTime` | défaut now()               |                   |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`
- `inviteCode` → `realm_invite_codes` — via `inviteCodeId`, onDelete: `SetNull`

**Index** : `unique(realmId,userId)`, `index(realmId)`, `index(userId)`

## `realms`

| Champ                   | Type       | Contraintes                | Note |
| :---------------------- | :--------- | :------------------------- | :--- |
| `id`                    | `Int`      | PK, défaut autoincrement() |      |
| `server`                | `String`   | —                          |      |
| `region`                | `String`   | défaut "EU"                |      |
| `guildName`             | `String`   | —                          |      |
| `createdBy`             | `Int`      | —                          |      |
| `createdAt`             | `DateTime` | défaut now()               |      |
| `updatedAt`             | `DateTime` | —                          |      |
| `discordGuildId`        | `String?`  | —                          |      |
| `discordRaidCategoryId` | `String?`  | —                          |      |
| `signupLockHours`       | `Int`      | défaut 24                  |      |
| `signupReminderHours`   | `Int`      | défaut 2                   |      |
| `confirmReminderHours`  | `Int`      | défaut 0                   |      |
| `tier`                  | `Int`      | défaut 1                   |      |
| `timezone`              | `String`   | défaut "Europe/Paris"      |      |

**Relations**

- `game` → `Game`
- `characters` → `characters`[]
- `owners` → `realm_owners`[]
- `instances` → `instances`[]
- `raid_events` → `raid_events`[]
- `raid_event_series` → `raid_event_series`[]
- `raid_guests` → `raid_guests`[]
- `member_absences` → `member_absences`[]
- `dungeon_availabilities` → `dungeon_availabilities`[]
- `dungeon_groups` → `dungeon_groups`[]
- `validation_settings` → `validation_settings`
- `activity_logs` → `activity_logs`[]
- `subscriptions` → `realm_subscriptions`[]
- `invite_codes` → `realm_invite_codes`[]
- `guest_members` → `realm_user_guests`[]
- `server_rel` → `servers` — via `server,region`, onDelete: `Cascade`

**Index** : `unique(region,server,guildName)`

## `regions`

| Champ  | Type     | Contraintes                | Note |
| :----- | :------- | :------------------------- | :--- |
| `id`   | `Int`    | PK, défaut autoincrement() |      |
| `name` | `String` | unique                     |      |

**Relations**

- `servers` → `servers`[]

## `servers`

| Champ      | Type     | Contraintes                | Note |
| :--------- | :------- | :------------------------- | :--- |
| `id`       | `Int`    | PK, défaut autoincrement() |      |
| `name`     | `String` | —                          |      |
| `slug`     | `String` | —                          |      |
| `locale`   | `String` | —                          |      |
| `category` | `String` | —                          |      |
| `region`   | `String` | —                          |      |

**Relations**

- `game` → `Game`
- `region_rel` → `regions` — via `region`, onDelete: `Cascade`
- `realms` → `realms`[]

**Index** : `unique(slug,region)`, `index(region)`, `index(game)`

## `specializations`

| Champ            | Type      | Contraintes                | Note                                                               |
| :--------------- | :-------- | :------------------------- | :----------------------------------------------------------------- |
| `id`             | `Int`     | PK, défaut autoincrement() |                                                                    |
| `name`           | `String`  | —                          | ex: "Fury", "Arms", "Protection"                                   |
| `classId`        | `Int`     | —                          |                                                                    |
| `role`           | `String`  | —                          | rôle de raid, en minuscules : "tank", "healer", "melee", "ranged"  |
| `icon`           | `String?` | —                          | URL de l'icône (optionnel)                                         |
| `blizzardSpecId` | `Int?`    | —                          | Blizzard playable specialization id (pour lier l'arbre de talents) |
| `talentTreeId`   | `Int?`    | —                          | Blizzard talent tree id (arbre de classe)                          |

**Relations**

- `class` → `classes` — via `classId`, onDelete: `Cascade`
- `characters` → `characters`[]
- `character_wishlists` → `character_wishlists`[]
- `talent_tree` → `talent_trees`
- `talent_loadouts` → `character_talent_loadouts`[]
- `upgrades` → `upgrades`[]
- `gear_snapshots` → `character_gear_snapshots`[]
- `offspecs` → `character_offspecs`[]

**Index** : `unique(name,classId)`, `index(classId)`

## `talent_hero_subtrees`

| Champ        | Type     | Contraintes                | Note                         |
| :----------- | :------- | :------------------------- | :--------------------------- |
| `id`         | `Int`    | PK, défaut autoincrement() |                              |
| `treeId`     | `Int`    | —                          |                              |
| `blizzardId` | `Int`    | —                          | hero talent tree id Blizzard |
| `name`       | `String` | —                          |                              |

**Relations**

- `tree` → `talent_trees` — via `treeId`, onDelete: `Cascade`
- `nodes` → `talent_nodes`[]

**Index** : `unique(treeId,blizzardId)`, `index(treeId)`

## `talent_nodes`

| Champ            | Type     | Contraintes                | Note                                                          |
| :--------------- | :------- | :------------------------- | :------------------------------------------------------------ |
| `id`             | `Int`    | PK, défaut autoincrement() |                                                               |
| `treeId`         | `Int`    | —                          |                                                               |
| `blizzardNodeId` | `Int`    | —                          | node id Blizzard                                              |
| `nodeType`       | `String` | —                          | "CLASS"                                                       | "SPEC" | "HERO" |
| `displayRow`     | `Int`    | —                          |                                                               |
| `displayCol`     | `Int`    | —                          |                                                               |
| `maxRank`        | `Int`    | défaut 1                   |                                                               |
| `heroSubTreeId`  | `Int?`   | —                          | renseigné pour les nœuds de type HERO                         |
| `entries`        | `Json`   | —                          | [{ talentId, spellId, name, icon, index }]                    |
| `unlockNodeIds`  | `Int[]`  | —                          | blizzardNodeIds que ce nœud débloque (pour tracer les arêtes) |

**Relations**

- `tree` → `talent_trees` — via `treeId`, onDelete: `Cascade`
- `heroSubTree` → `talent_hero_subtrees` — via `heroSubTreeId`, onDelete: `SetNull`

**Index** : `unique(treeId,blizzardNodeId)`, `index(treeId)`, `index(heroSubTreeId)`

## `talent_trees`

| Champ              | Type       | Contraintes                | Note                                    |
| :----------------- | :--------- | :------------------------- | :-------------------------------------- |
| `id`               | `Int`      | PK, défaut autoincrement() |                                         |
| `specializationId` | `Int`      | unique                     |                                         |
| `blizzardTreeId`   | `Int`      | —                          | talentTreeId Blizzard (arbre de classe) |
| `blizzardSpecId`   | `Int`      | —                          | playable specialization id Blizzard     |
| `updatedAt`        | `DateTime` | —                          |                                         |

**Relations**

- `specialization` → `specializations` — via `specializationId`, onDelete: `Cascade`
- `nodes` → `talent_nodes`[]
- `heroSubTrees` → `talent_hero_subtrees`[]

**Index** : `index(specializationId)`

## `upgrades`

| Champ              | Type       | Contraintes                | Note                                                     |
| :----------------- | :--------- | :------------------------- | :------------------------------------------------------- |
| `id`               | `Int`      | PK, défaut autoincrement() |                                                          |
| `characterID`      | `Int`      | —                          |                                                          |
| `itemID`           | `Int`      | —                          |                                                          |
| `reportID`         | `String`   | —                          |                                                          |
| `dps`              | `Float`    | —                          |                                                          |
| `baseDps`          | `Float`    | —                          |                                                          |
| `spec`             | `String`   | —                          | libellé brut de la sim (Raidbots : « Elemental Shaman ») |
| `specializationId` | `Int?`     | —                          |                                                          |
| `metric`           | `String`   | défaut "dps"               |                                                          |
| `difficulty`       | `String`   | —                          |                                                          |
| `timeStamp`        | `DateTime` | —                          |                                                          |
| `talents`          | `String`   | défaut ""                  |                                                          |
| `buildDate`        | `String`   | défaut ""                  |                                                          |

**Relations**

- `difficulty_rel` → `difficulties` — via `difficulty`, onDelete: `Restrict`
- `items` → `items` — via `itemID`, onDelete: `Cascade`
- `characters` → `characters` — via `characterID`, onDelete: `Cascade`
- `specialization` → `specializations` — via `specializationId`, onDelete: `SetNull`

**Index** : `unique(characterID,itemID,reportID,difficulty,spec)`, `index(timeStamp)`, `index(specializationId)`

## `validation_settings`

| Champ                | Type       | Contraintes                                                                                                                                                                                                                                     | Note |
| :------------------- | :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `id`                 | `Int`      | PK, défaut autoincrement()                                                                                                                                                                                                                      |      |
| `realmId`            | `Int`      | unique                                                                                                                                                                                                                                          |      |
| `allowedFightStyles` | `String[]` | défaut ["Patchwerk"]                                                                                                                                                                                                                            |      |
| `fightLength`        | `Int`      | défaut 300                                                                                                                                                                                                                                      |      |
| `enemyCount`         | `Int`      | défaut 1                                                                                                                                                                                                                                        |      |
| `raidBuffsConfig`    | `Json`     | défaut "{\"skyfury\": true, \"bloodlust\": true, \"fortitude\": true, \"chaosBrand\": true, \"battleShout\": true, \"huntersMark\": true, \"mysticTouch\": true, \"markOfTheWild\": true, \"powerInfusion\": false, \"arcaneIntellect\": true}" |      |
| `simStaleAfterDays`  | `Int`      | défaut 7                                                                                                                                                                                                                                        |      |
| `createdAt`          | `DateTime` | défaut now()                                                                                                                                                                                                                                    |      |
| `updatedAt`          | `DateTime` | —                                                                                                                                                                                                                                               |      |

**Relations**

- `realm` → `realms` — via `realmId`, onDelete: `Cascade`

**Index** : `index(realmId)`

## `wow_items`

| Champ           | Type       | Contraintes  | Note                                               |
| :-------------- | :--------- | :----------- | :------------------------------------------------- |
| `id`            | `Int`      | PK           | Blizzard item ID                                   |
| `name`          | `String`   | —            |                                                    |
| `quality`       | `Int`      | —            | 0-5: Poor, Common, Uncommon, Rare, Epic, Legendary |
| `itemLevel`     | `Int`      | —            |                                                    |
| `inventoryType` | `Int`      | —            |                                                    |
| `itemClass`     | `Int`      | —            |                                                    |
| `itemSubClass`  | `Int`      | —            |                                                    |
| `icon`          | `String`   | —            |                                                    |
| `description`   | `String?`  | —            |                                                    |
| `stats`         | `Json?`    | —            | Item stats as JSON array                           |
| `rawData`       | `Json`     | —            | Full Blizzard API response                         |
| `createdAt`     | `DateTime` | défaut now() |                                                    |
| `updatedAt`     | `DateTime` | —            |                                                    |

**Index** : `index(quality)`, `index(itemLevel)`
