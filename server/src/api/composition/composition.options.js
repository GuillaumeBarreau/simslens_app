const {
  DEFAULT_HEALER_RATIO,
  DEFAULT_WEIGHTS,
  MAX_HISTORY_WEEKS,
} = require('./composition.constants');

/**
 * Ces réglages viennent de curseurs de l'interface : une valeur hors bornes
 * est ramenée dans l'intervalle plutôt que rejetée, d'où une normalisation
 * maison au lieu d'un schéma Joi (qui, lui, refuserait la requête).
 */

/** Version du format de `context` acceptée par le service. */
const SUPPORTED_CONTEXT_SCHEMA_VERSION = 1;

const MAX_HEALER_RATIO = 0.5;

/**
 * Ramène une valeur dans [0, 1], ou retourne le repli si elle est inexploitable.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function clamp01(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

/**
 * Ramène un nombre fini dans [min, max], ou retourne le repli.
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function clampNumber(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * @typedef {Object} CompositionOptions
 * @property {{ buffs: number, upgrades: number, history: number }} weights
 * @property {number | undefined} sizeOverride
 * @property {number} healerRatio
 * @property {number} historyWeeks
 * @property {number[] | null} selectedBossIds
 * @property {number} minBossesPerPlayer
 * @property {Object | null} context
 */

/**
 * @param {Object} [body]
 * @returns {CompositionOptions} options prêtes pour compositionService.generateComposition
 */
function normalizeCompositionOptions(body = {}) {
  const selectedBossIds = Array.isArray(body.selectedBossIds)
    ? body.selectedBossIds
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isFinite(id) && id > 0)
    : null;

  return {
    weights: {
      buffs: clamp01(body?.weights?.buffs, DEFAULT_WEIGHTS.buffs),
      upgrades: clamp01(body?.weights?.upgrades, DEFAULT_WEIGHTS.upgrades),
      history: clamp01(body?.weights?.history, DEFAULT_WEIGHTS.history),
    },
    // Volontairement non borné ici : le plafond par difficulté est appliqué
    // plus bas par resolveSizeCap dans le service.
    sizeOverride:
      typeof body.sizeOverride === 'number' && Number.isFinite(body.sizeOverride)
        ? body.sizeOverride
        : undefined,
    healerRatio: clampNumber(body.healerRatio, 0, MAX_HEALER_RATIO, DEFAULT_HEALER_RATIO),
    historyWeeks: Math.floor(
      clampNumber(body.historyWeeks, 1, MAX_HISTORY_WEEKS, MAX_HISTORY_WEEKS),
    ),
    selectedBossIds,
    minBossesPerPlayer:
      typeof body.minBossesPerPlayer === 'number' && Number.isFinite(body.minBossesPerPlayer)
        ? Math.max(0, Math.floor(body.minBossesPerPlayer))
        : 0,
    context:
      body.context && body.context.schemaVersion === SUPPORTED_CONTEXT_SCHEMA_VERSION
        ? body.context
        : null,
  };
}

/**
 * Normalise le nombre de semaines d'historique demandé en query.
 * @param {unknown} historyWeeks
 * @returns {number}
 */
function normalizeHistoryWeeks(historyWeeks) {
  if (historyWeeks == null || !Number.isFinite(Number(historyWeeks))) return MAX_HISTORY_WEEKS;
  return Math.min(MAX_HISTORY_WEEKS, Math.max(1, parseInt(historyWeeks, 10)));
}

module.exports = {
  MAX_HEALER_RATIO,
  SUPPORTED_CONTEXT_SCHEMA_VERSION,
  clamp01,
  clampNumber,
  normalizeCompositionOptions,
  normalizeHistoryWeeks,
};
