/**
 * Permissions accordées par chaque rôle de royaume, d'après les fichiers de
 * rôles (shared/config/permissions/role_*.json), lus ici sans les modifier.
 *
 * checkPermission fait la même correspondance pour autoriser une route ; ce
 * module sert aux handlers qui doivent distinguer, sur une route déjà
 * autorisée, un accès par le rôle d'un accès par `allowSelfEdit`.
 */

import adminRole from './config/permissions/role_admin.json';
import guestRole from './config/permissions/role_guest.json';
import memberRole from './config/permissions/role_member.json';
import moderatorRole from './config/permissions/role_moderator.json';

export const PERMISSIONS_BY_ROLE: Record<string, Record<string, boolean>> = {
  owner: adminRole,
  admin: adminRole,
  moderator: moderatorRole,
  member: memberRole,
  guest: guestRole,
};

/** Le rôle accorde-t-il cette permission ? Faux pour un rôle absent ou inconnu. */
export function roleHasPermission(role: string | null | undefined, permission: string): boolean {
  return !!role && PERMISSIONS_BY_ROLE[role]?.[permission] === true;
}
