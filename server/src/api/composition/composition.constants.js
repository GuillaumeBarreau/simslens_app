const { normalizeClass } = require('../../shared/utils/normalizeClass');

/**
 * Mapping buffKey (validation_settings.raidBuffsConfig) → list of WoW classes
 * that can provide it. A signed-up character of any of these classes counts as
 * a provider for that buff.
 *
 * Les classes sont au format stocké en base (`mage`, `demon_hunter`) : toute
 * comparaison passe par `providesBuff`, qui normalise la classe du personnage
 * (SIMS-219).
 */
const BUFF_PROVIDERS = {
  bloodlust: ['shaman', 'mage', 'hunter', 'evoker'],
  arcaneIntellect: ['mage'],
  fortitude: ['priest'],
  battleShout: ['warrior'],
  mysticTouch: ['monk'],
  chaosBrand: ['demon_hunter'],
  skyfury: ['shaman'],
  markOfTheWild: ['druid'],
  huntersMark: ['hunter'],
  powerInfusion: ['priest'],
};

/**
 * Vrai si un personnage de la classe `className` apporte un buff fourni par
 * `providers`. La classe est normalisée : `'Demon Hunter'` et `'demon_hunter'`
 * sont reconnus de la même façon.
 *
 * @param {string[]} providers classes fournisseuses (format BUFF_PROVIDERS)
 * @param {string | null | undefined} className
 * @returns {boolean}
 */
function providesBuff(providers, className) {
  const normalized = normalizeClass(className);
  return normalized !== '' && providers.some((p) => normalizeClass(p) === normalized);
}

// Les rôles (spec → TANK/HEALER/MELEE/RANGED, rôles d'une classe) vivent dans
// un seul module : shared/constants/roles (SIMS-207).

const DIFFICULTY_HARD_CAP_BY_KEY = {
  mythic: 20,
};
const DIFFICULTY_HARD_CAP = DIFFICULTY_HARD_CAP_BY_KEY;
const DEFAULT_FLEX_CAP = 30;

function normalizeDifficultyKey(name) {
  return (name || '').toLowerCase().trim();
}

/**
 * Mythic is locked at 20. Everything else is capped at `sizeOverride` (or 30).
 */
function resolveSizeCap(difficultyName, poolSize, sizeOverride) {
  const key = normalizeDifficultyKey(difficultyName);
  if (key && DIFFICULTY_HARD_CAP_BY_KEY[key]) {
    return Math.min(poolSize, DIFFICULTY_HARD_CAP_BY_KEY[key]);
  }
  const requested = Number.isFinite(sizeOverride) ? sizeOverride : DEFAULT_FLEX_CAP;
  return Math.min(poolSize, Math.max(1, Math.min(DEFAULT_FLEX_CAP, requested)));
}

const DEFAULT_WEIGHTS = { buffs: 0.5, upgrades: 0.3, history: 0.2 };
const DEFAULT_HEALER_RATIO = 0.2;
const TANK_TARGET = 2;
const MAX_HISTORY_WEEKS = 6;

/**
 * Nominal raid size by difficulty — used as the *target* size when computing
 * default role distributions, regardless of how many players actually signed
 * up. So with 0 PRESENT signups, defaults still come back as 2/4/7/7 (Mythic)
 * instead of 0/0/0/0.
 */
const NOMINAL_RAID_SIZE_BY_KEY = {
  mythic: 20,
  heroic: 25,
  normal: 25,
  lfr: 25,
};
const NOMINAL_RAID_SIZE = NOMINAL_RAID_SIZE_BY_KEY;
const NOMINAL_FLEX_SIZE = 25;

function resolveNominalSize(difficultyName) {
  const key = normalizeDifficultyKey(difficultyName);
  return NOMINAL_RAID_SIZE_BY_KEY[key] || NOMINAL_FLEX_SIZE;
}

module.exports = {
  BUFF_PROVIDERS,
  providesBuff,
  resolveSizeCap,
  resolveNominalSize,
  DIFFICULTY_HARD_CAP,
  DEFAULT_FLEX_CAP,
  DEFAULT_WEIGHTS,
  DEFAULT_HEALER_RATIO,
  TANK_TARGET,
  MAX_HISTORY_WEEKS,
  NOMINAL_RAID_SIZE,
  NOMINAL_FLEX_SIZE,
};
