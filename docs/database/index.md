# 🗄️ Installation et gestion de la base de données

Ce projet utilise **Prisma** avec **PostgreSQL** pour gérer la base de données.

## 📦 Installation initiale

1. **Installer les dépendances** :

   ```bash
   npm install
   ```

2. **Démarrer PostgreSQL** (conteneur local, publié sur le port `5433`) :

   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

   `DATABASE_URL` dans votre `.env.local` doit pointer sur ce conteneur, puis être
   propagé vers `server/.env` avec `npm run env:local`.

3. **Générer le client Prisma** :

   ```bash
   cd server
   npx prisma generate
   ```

4. **Appliquer les migrations** :

   ```bash
   npx prisma migrate deploy
   ```

5. **Charger les données initiales (seed)** :

   ```bash
   npx prisma db seed          # depuis server/
   # ou, depuis la racine :
   npm run server:init-data
   ```

   Les deux exécutent `server/src/scripts/initData.js`.

### ⚠️ Données de référence obligatoires

Les migrations créent les tables mais ne les remplissent pas. `classes` et
`specializations` ne sont peuplées **que** par le seed ci-dessus (étapes
`seedClasses` et `seedSpecializations`). Sans elles, l'application démarre mais
l'import de guilde, la création de personnage (clé étrangère `classes.name`) et le
choix de spécialisation échouent.

- **Toute nouvelle base, y compris en production**, doit être seedée une fois après
  les migrations : `npm run server:init-data`, ou `INIT_DATA_ON_START=1` au premier
  démarrage du conteneur (`server/docker-entrypoint.sh`). En production la variable vaut
  `0` : le seed y est une étape manuelle.
- Au démarrage, le serveur vérifie ces deux tables et écrit un avertissement
  `[ReferenceData]` dans ses logs si l'une est vide
  (`server/src/shared/utils/referenceDataCheck.ts`). Il ne bloque pas le démarrage.

---

## 🎲 Données de test (fake data)

Pour peupler une base de développement avec une guilde complète — personnages,
événements, inscriptions, wishlists, historique :

```bash
npm run server:init-fake-data
```

> ⚠️ **À ne jamais lancer en production.** Le script **vide** six tables avant de
> réinsérer (voir le tableau ci-dessous).

### Prérequis

Les données de référence doivent déjà être chargées (`npm run server:init-data`) :
les scripts s'appuient sur les classes, spécialisations, serveurs et objets existants.

### ⚠️ Rattacher votre compte, sinon l'application reste vide

Les guildes générées appartiennent à des propriétaires **fictifs**. Votre compte
Battle.net n'en est membre d'aucune, donc les pages protégées répondent `403` et vous
ne voyez rien — alors que la base est pleine.

Renseignez votre identifiant Battle.net avant de lancer le seed :

```bash
SEED_OWNER_ID=102041111 npm run server:init-fake-data
```

Vous serez ajouté comme `owner` de chaque guilde générée. Pour retrouver votre
identifiant, connectez-vous une fois à l'application puis :

```bash
docker exec droptimizer-redis redis-cli --scan --pattern "sess:*" \
  | xargs -I{} docker exec droptimizer-redis redis-cli GET {}
```

L'identifiant est le champ `passport.user.id` de la session.

### Alimenter une seule guilde

Les scripts travaillent par défaut sur **toutes** les guildes, et les étapes non
destructives (personnages, événements, inscriptions) s'ajoutent à l'existant : un
second passage les duplique partout.

`SEED_REALM_ID` restreint tout le traitement à une guilde — y compris les purges, qui
sinon videraient les tables des autres :

```bash
SEED_REALM_ID=17 npm run server:init-fake-data
```

C'est la commande à utiliser pour alimenter une guilde que vous venez de créer dans
l'application. `seedGuilds` est alors ignoré : on cible une guilde existante, pas
besoin d'en fabriquer de nouvelles.

Pour retrouver l'identifiant de votre guilde :

```bash
docker exec droptimizer-postgres psql -U postgres -d droptimizer \
  -c 'select id, "guildName", server from realms order by id;'
```

### Ce que ça génère

[`initFakeData.js`](../../server/src/scripts/seedFakeData/initFakeData.js) enchaîne
11 scripts dans l'ordre des dépendances. Volumes constatés sur une base vierge :

| Étape                       | Table(s)                                          |   Volume | Vide avant |
| --------------------------- | ------------------------------------------------- | -------: | :--------: |
| `seedGuilds`                | `realms`, `realm_owners`                          |        6 |    non     |
| `seedCharacters`            | `characters`                                      |      116 |    non     |
| `updateCharacterSpecs`      | met à jour les spés des personnages               |        — |    non     |
| `seedAbsences`              | `member_absences`                                 |       19 |  **oui**   |
| `seedInstances`             | `instances`, `instance_bosses`                    | 18 / 198 |  **oui**   |
| `seedEvents`                | `raid_events`                                     |       28 |    non     |
| `seedAttendance`            | `raid_signups`                                    |      313 |    non     |
| `seedGearSnapshots`         | `character_gear_snapshots`, `gear_snapshot_items` | 37 / 555 |  **oui**   |
| `seedWishlists`             | `character_wishlists`                             |      527 |  **oui**   |
| `seedUpgrades`              | `upgrades`                                        |      925 |  **oui**   |
| `seedActivityLogs`          | `activity_logs`                                   |       91 |  **oui**   |
| `seedDungeonAvailabilities` | `dungeon_availabilities`                          |      899 |  **oui**   |

Les tables marquées **oui** sont purgées par un `deleteMany` en début d'étape : toute
donnée que vous auriez saisie à la main y est perdue. Les autres s'ajoutent à
l'existant (`create` / `upsert`), donc relancer le script plusieurs fois **duplique**
personnages et événements.

Cinq guildes sont créées, plus une secondaire (`TestGuildSecondary`) qui sert à
vérifier l'isolation des données entre guildes.

Les événements sont générés **relativement à la date du jour** (mardi et jeudi 20h, de
la semaine précédente aux trois suivantes), pour que le calendrier ne soit jamais vide.
Les instances couvrent les difficultés normal / heroic / mythic du raid de l'extension
et de la saison courantes — celles de `VITE_WOW_EXTENSION` et `VITE_CURRENT_SEASON`,
surchargeables via `SEED_EXTENSION` et `SEED_SEASON`.

### Repartir de zéro

```bash
npm run db:reset                 # migrate reset --force + generate + init-data
npm run server:init-fake-data
```

## 🔧 Commandes Prisma courantes

| Commande                              | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `npx prisma generate`                 | Génère le client Prisma après modification du schéma |
| `npx prisma migrate dev --name <nom>` | Crée une nouvelle migration en développement         |
| `npx prisma migrate deploy`           | Applique les migrations (production)                 |
| `npx prisma db seed`                  | Charge les données initiales dans la base            |
| `npx prisma studio`                   | Ouvre l'interface graphique pour explorer la base    |
| `npx prisma db pull`                  | Synchronise le schéma avec la base existante         |

## 📝 Workflow de développement

1. **Modifier le schéma** : Éditez `server/prisma/schema.prisma`
2. **Créer une migration** :
   ```bash
   npx prisma migrate dev --name description_du_changement
   ```
3. **Le client est automatiquement régénéré** lors de la migration

## ⚠️ Notes importantes

- **Toujours dans le dossier `server`** : Exécutez les commandes Prisma depuis `server/`
  (ou utilisez les raccourcis `npm run prisma:*` depuis la racine)
- **Production** : Utilisez uniquement `migrate deploy`, jamais `migrate dev`
- **Le schéma est la source de vérité** : Toute modification doit passer par `schema.prisma`
- **`npm run db:reset`** enchaîne `migrate reset --force`, `generate` et le seed.
  ⚠️ Détruit toutes les données locales.

## 🔗 Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Prisma avec PostgreSQL](https://www.prisma.io/docs/orm/overview/databases/postgresql)
