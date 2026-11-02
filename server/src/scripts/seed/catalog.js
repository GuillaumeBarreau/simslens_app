/**
 * Catalogue de référence des seeds (raids, boss, difficultés) : Retail et WoW Forever
 * (SIMS-027). Les données Forever vivent dans `data/forever/` (voir son README).
 *
 * Les `require` restent statiques : tsc copie ainsi les JSON dans `dist/`.
 */

const { GAMES, gameFromExtension } = require('../../shared/game/games');

const RAID_FILES = [require('../data/raids.json'), require('../data/forever/raids.json')];
const BOSS_FILES = [require('../data/boss.json'), require('../data/forever/bosses.json')];

/** Difficultés de raid connues : `difficulties.name`, avec leur description. */
const RAID_DIFFICULTIES = [
  { key: 'lfr', label: 'LFR', description: 'Looking For Raid difficulty.' },
  { key: 'normal', label: 'Normal', description: 'Standard encounter difficulty.' },
  { key: 'heroic', label: 'Heroic', description: 'Increased difficulty for experienced groups.' },
  { key: 'mythic', label: 'Mythic', description: 'Highest challenge, limited availability.' },
];

/**
 * Lève une erreur si deux entrées partagent la même valeur de `key` : les seeds
 * upsertent par identifiant et `raids.name` est unique en base.
 */
function assertUnique(entries, key, label) {
  const seen = new Set();
  for (const entry of entries) {
    const value = entry[key];
    if (seen.has(value)) throw new Error(`Duplicate ${label} ${key}: ${value}`);
    seen.add(value);
  }
}

function loadRaids(files = RAID_FILES) {
  const raids = files.flat();
  assertUnique(raids, 'id', 'raid');
  assertUnique(raids, 'name', 'raid');
  return raids;
}

/**
 * Lève une erreur si une même valeur de `key` apparaît dans deux fichiers : un jeu ne
 * doit pas écraser les entrées d'un autre.
 */
function assertDisjoint(lists, key, label) {
  const owner = new Map();
  lists.forEach((entries, index) => {
    for (const entry of entries) {
      const value = entry[key];
      if (owner.has(value) && owner.get(value) !== index) {
        throw new Error(`Duplicate ${label} ${key} across files: ${value}`);
      }
      owner.set(value, index);
    }
  });
}

/**
 * Les doublons internes à un fichier ne sont pas refusés ici : `data/boss.json`
 * (Retail) en contient déjà un. Un fichier ne peut pas réutiliser l'identifiant
 * d'un autre.
 */
function loadBosses(files = BOSS_FILES) {
  const lists = files.map((list) =>
    list.filter((boss) => boss && typeof boss.bossId !== 'undefined'),
  );
  assertDisjoint(lists, 'bossId', 'boss');
  return lists.flat();
}

/** Difficultés proposées pour un raid, selon le jeu de son `extension`. */
function raidDifficultiesFor(extension) {
  const allowed = GAMES[gameFromExtension(extension)].difficulties;
  return RAID_DIFFICULTIES.filter((d) => allowed.includes(d.key));
}

module.exports = {
  RAID_DIFFICULTIES,
  assertDisjoint,
  assertUnique,
  loadRaids,
  loadBosses,
  raidDifficultiesFor,
};
