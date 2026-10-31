/**
 * Rôles attribuables sur un royaume (cf. realm_owners.role dans schema.prisma).
 * L'ordre reflète le niveau de privilège décroissant.
 */
export const REALM_OWNER_ROLES = ['owner', 'admin', 'moderator'];
