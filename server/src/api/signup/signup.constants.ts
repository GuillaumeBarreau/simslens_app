/**
 * Rôles de royaume qui échappent au verrou d'inscription.
 *
 * Ils gèrent le roster : leur interdire de corriger une inscription juste
 * avant le raid irait contre l'objet même du verrou.
 */
export const ADMIN_ROLES = new Set(['owner', 'admin', 'moderator']);

/**
 * Délai de verrouillage appliqué quand le royaume n'en définit pas.
 * Zéro désactive le verrou.
 */
export const DEFAULT_SIGNUP_LOCK_HOURS = 24;
