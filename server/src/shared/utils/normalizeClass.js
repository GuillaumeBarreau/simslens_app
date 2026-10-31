/**
 * Normalizes class names to the snake_case format used in the database.
 * Handles cases like "Death Knight" -> "death_knight", "Demon Hunter" -> "demon_hunter".
 *
 * En JavaScript pour être chargé par `require` depuis les modules CommonJS
 * (shared/constants/roles) ; `utils/normalizeClass` le ré-exporte pour le code TS.
 *
 * @param {string | undefined | null} className - The class name to normalize (e.g. from Blizzard API)
 * @returns {string} The normalized class name
 */
function normalizeClass(className) {
  if (!className) return '';
  return className.trim().toLowerCase().replace(/\s+/g, '_');
}

module.exports = { normalizeClass };
