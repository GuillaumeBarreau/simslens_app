/**
 * Normalizes class names to the snake_case format used in the database.
 * Handles cases like "Death Knight" -> "death_knight", "Demon Hunter" -> "demon_hunter".
 *
 * L'implémentation vit en JavaScript (shared/utils/normalizeClass) pour être
 * partagée avec les modules CommonJS, dont le référentiel des rôles.
 */
export { normalizeClass } from '../shared/utils/normalizeClass';
