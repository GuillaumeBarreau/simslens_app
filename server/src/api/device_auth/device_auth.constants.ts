/**
 * Rôles autorisés à appairer un appareil sur un royaume.
 *
 * Le modérateur en est exclu : un jeton d'appareil écrit du butin sans
 * repasser par l'interface.
 */
export const ADMIN_ROLES = new Set(['owner', 'admin']);

/** Portée accordée à tout appareil appairé. */
export const SYNC_LOOT_SCOPE = 'sync:loot:write';
