import realmRepo from '../../realm/realm.repository';
import { GroupMemberNotFoundError, GroupMemberNotInRealmError } from '../dungeon_group.errors';
import groupRepo from '../dungeon_group.repository';
import type { GroupEntity, GroupMemberEntity } from '../dungeon_group.types';
import { getGroupById } from './manageGroups';

/**
 * Ajoute un membre au groupe. Le royaume est celui du groupe, déjà vérifié
 * par requireGroupInRealm : l'utilisateur doit y avoir un rôle (propriétaire,
 * membre ou invité).
 *
 * Un même compte peut occuper plusieurs places : un compte Battle.net est
 * parfois partagé par plusieurs joueurs d'une même famille (SIMS-193).
 *
 * @returns le membre ajouté et le groupe à jour
 * @throws {GroupMemberNotInRealmError} si l'utilisateur n'a aucun rôle sur le royaume
 */
export async function addGroupMember(
  groupId: number,
  realmId: number,
  userId: string,
  role: string,
): Promise<{ member: GroupMemberEntity; group: GroupEntity | null }> {
  const realmRole = await realmRepo.getRealmUserRole(realmId, userId);
  if (!realmRole) throw new GroupMemberNotInRealmError();

  console.log('[Dungeon Group Service] Adding member:', { groupId, userId, role });
  const member = await groupRepo.addMember(groupId, userId, role);

  return { member, group: await getGroupById(groupId) };
}

/**
 * Retire un membre du groupe.
 *
 * @returns le groupe à jour
 * @throws {GroupMemberNotFoundError} si l'utilisateur n'est pas membre de ce groupe
 */
export async function removeGroupMember(
  groupId: number,
  userId: string,
): Promise<GroupEntity | null> {
  console.log('[Dungeon Group Service] Removing member:', { groupId, userId });
  const { count } = await groupRepo.removeMember(groupId, userId);
  if (count === 0) throw new GroupMemberNotFoundError();

  return getGroupById(groupId);
}
