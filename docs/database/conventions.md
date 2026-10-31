# Documentation de la base de données

## Vue d'ensemble

**PostgreSQL 15**, accédée via **Prisma**. La base gère l'ensemble des données de
Droptimizer : personnages, guildes (realms), raids, événements, loots et attributions.

La liste exhaustive des tables et de leurs champs est dans
[`schema.md`](schema.md), **généré depuis `schema.prisma`**. Ce
fichier-ci ne contient que ce qu'un générateur ne peut pas déduire : conventions,
pièges et requêtes de référence.

> La source de vérité reste
> [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma).

---

## Conventions de nommage

- **Modèles Prisma** : pluriel en `snake_case` (`loot_votes`, `raid_signups`). Certains
  portent un `@@map` vers un nom SQL différent — la colonne « Nom SQL » de
  [`schema.md`](schema.md) le signale.
- **Champs** : camelCase pour les champs récents, snake_case pour l'historique. Les
  deux coexistent, y compris dans une même table (`raids.image_button` vs
  `raids.instanceId`).
- **Clés étrangères** : nom de l'entité + suffixe `Id` (`realmId`, `instanceId`).
- **Relations nommées** : quand deux FK pointent la même table, Prisma génère un nom
  composé — par exemple `imported_loots_imported_loots_ownerTocharacters`. Verbeux
  mais imposé par Prisma.

---

## Pièges connus

### `raids` n'a presque aucune relation

Contre-intuitivement, `raids` ne référence **ni** `bosses`, **ni** `instances`, **ni**
`realms` : sa seule relation est `raid_difficulties[]`. Le lien vers une instance se
fait par le scalaire `instanceId`, sans relation Prisma déclarée.

Un `include: { bosses: true }` sur `raids` échoue donc à l'exécution.

### `bosses` est relié par nom, pas par identifiant

`bosses.raidName` est une chaîne, il n'existe pas de `bosses.raidId`. Les jointures
raid → boss se font sur le nom.

### Types de timestamp hétérogènes

`DateTime` est le type courant, mais quelques champs historiques sont encore en
`BigInt` (timestamps epoch). Vérifier le type dans
[`schema.md`](schema.md) avant toute comparaison de dates —
`characters.lastModified` est un `DateTime`, contrairement à ce que son nom suggère.

### Cascades

- `onDelete: Cascade` — supprimer le parent supprime les enfants (ex : supprimer un
  realm supprime ses `realm_owners`).
- `onDelete: SetNull` — le champ passe à `null` (ex : `characters.realmId`).
- Un `character` supprimé ne supprime donc pas ses `imported_loots`.

---

## Migrations

```bash
cd server
npx prisma migrate dev --name description_migration   # créer (dev uniquement)
npx prisma migrate deploy                             # appliquer (production)
npx prisma generate                                   # régénérer le client
```

Depuis la racine, les raccourcis `npm run prisma:*` font la même chose — voir le
[guide de développement](../development.fr.md#-commandes-utiles).

Après toute migration, régénérer la référence :
[`schema.md`](schema.md) est un artefact, pas un document vivant.

---

## Requêtes de référence

### Personnages d'un realm

```javascript
const characters = await prisma.characters.findMany({
  where: { realmId: userRealmId, archived: 0 },
  include: { classes: true, specialization: true },
});
```

### Votes d'un loot

```javascript
const votes = await prisma.loot_votes.findMany({
  where: { lootId },
  orderBy: [{ choice: 'asc' }, { createdAt: 'asc' }],
});
```

### Boss d'un raid

La jointure passe par le **nom** du raid, pas par un identifiant :

```javascript
const bosses = await prisma.bosses.findMany({
  where: { raidName: raid.name, extension, season },
  include: { loots: true },
});
```

---

## Sécurité

- **Isolation par realm** : toute requête exposée par l'API doit filtrer sur
  `realmId`. Le middleware
  [`checkPermission`](../../server/src/middleware/checkPermission.js) résout le realm et
  le pose sur `req.realmId` — s'en servir plutôt que de faire confiance au client.
- **Validation** : les entrées API sont validées avec **Joi**
  (`<domain>.validation.js`). Zod n'est pas utilisé côté serveur : les types des
  entités viennent de `@prisma/client`.
- **Contraintes** : les `@@unique` composites empêchent les doublons critiques
  (`characters(name, realm)`, `realm_owners(realmId, ownerId)`).

---

## Historique des évolutions

Points de la précédente version de ce document qui ont depuis été livrés :

- ✅ **Séparation authentification / personnage** — `characters.userId` référence
  désormais l'utilisateur Battle.net.
- ✅ **Gestion fine des rôles** — non par une table `permissions`, mais par les
  fichiers [`role_*.json`](../../server/src/shared/config/permissions/). Voir
  [ADMIN_GUIDE](../ADMIN_GUIDE.md).
- ✅ **Traçabilité des actions critiques** — table `activity_logs`.

Reste ouvert :

- Table `notifications` pour persister les notifications importantes.
