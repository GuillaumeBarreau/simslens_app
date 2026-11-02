# Données de référence WoW Forever

Catalogue versionné de WoW Forever, chargé par les seeds existants
(`server/src/scripts/seed/`, via `seed/catalog.js`). Contexte : `docs/forever/README.md`.

## Palier 1 (SIMS-027) — collecté le 2 novembre 2026

| Fichier       | Contenu                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `raids.json`  | Barrow Deeps, Hyjal Summit, Onyxia's Lair : `extension = "Forever"`, `season = "tier-1"`        |
| `bosses.json` | 22 boss (8, 13 et 1), rattachés à leur raid par `raidName`, sans table de loot (`loots` absent) |

Chaque entrée porte ses `sources` (URL). Les tailles de raid (10, 20, 40) et les
spécialisations Forever sont dans le registre des jeux (`server/src/shared/game/games.ts`).
Les raids Forever n'ont que la difficulté `normal` (`seedRaidDifficulties.js`).

### Provisoire, à revoir à l'ouverture des raids (9 décembre 2026)

- **Ordre des boss non confirmé** : `order` suit l'ordre des sources, pas l'ordre de
  rencontre en jeu. Hyjal Summit propose des itinéraires au choix : l'ordre peut rester
  conventionnel.
- **Tables de loot non publiées** : aucun objet n'est rattaché aux boss. Ne pas en
  inventer ; ajouter `loots` (identifiants d'objets) quand elles seront sourcées.
- Pas d'icônes (`icon: null`) ni d'`instanceId` pour Barrow Deeps et Hyjal Summit.

## Identifiants

Les identifiants sont internes et **stables** : les instances, événements et notes de
boss les référencent. Ne pas les renuméroter.

- Raids : plage `9001`+ (Retail : `1`, `2`, `3`…).
- Boss : `900000 + 100 × n° du raid dans le palier + ordre` (`900101` à `900301`), hors
  de la plage des identifiants de rencontre Blizzard utilisés par Retail. La formule ne
  sert qu'à la création : si l'ordre d'un boss change, modifier `order`, pas `bossId`.

`seed/catalog.js` refuse un nom de raid en double (`raids.name` est unique) et un
identifiant de raid ou de boss partagé entre Retail et Forever.
