/**
 * Invités ponctuels d'un groupe de donjon, avec leur placement éventuel
 * sur un emplacement de composition.
 */

import { DUNGEON_ROLES, normalizeRole } from '../../../shared/constants/roles';
import {
  GroupGuestNameRequiredError,
  GroupGuestNotFoundError,
  InvalidDungeonRoleError,
} from '../dungeon_group.errors';
import groupRepo from '../dungeon_group.repository';
import type { AddGroupGuestInput, GroupEntity } from '../dungeon_group.types';
import { getGroupById } from './manageGroups';

export async function addGroupGuest(
  groupId: number,
  input: AddGroupGuestInput,
): Promise<GroupEntity | null> {
  const normalizedRole = normalizeRole(input.role);
  if (!DUNGEON_ROLES.includes(normalizedRole)) {
    throw new InvalidDungeonRoleError(DUNGEON_ROLES);
  }

  if (!input.name || !input.name.trim()) {
    throw new GroupGuestNameRequiredError();
  }

  await groupRepo.addGuest(groupId, {
    realmId: input.realmId,
    name: input.name.trim(),
    role: normalizedRole,
    class: input.class,
    addedBy: input.addedBy,
  });

  return getGroupById(groupId);
}

/**
 * Retire un invité du groupe. Un invité d'un autre groupe est introuvable :
 * le royaume n'est vérifié que pour le groupe de la route.
 *
 * @returns le groupe à jour
 * @throws {GroupGuestNotFoundError} si l'invité n'est pas dans ce groupe
 */
export async function removeGroupGuest(
  groupId: number,
  guestId: number,
): Promise<GroupEntity | null> {
  const { count } = await groupRepo.removeGuest(groupId, guestId);
  if (count === 0) throw new GroupGuestNotFoundError();

  return getGroupById(groupId);
}

/**
 * Place un invité du groupe sur un emplacement de composition, ou l'en
 * retire lorsque slotId vaut null.
 *
 * @returns le groupe à jour
 * @throws {GroupGuestNotFoundError} si l'invité n'est pas dans ce groupe
 */
export async function updateGroupGuestSlot(
  groupId: number,
  guestId: number,
  slotId: string | null,
): Promise<GroupEntity | null> {
  const { count } = await groupRepo.updateGuest(groupId, guestId, { slotId: slotId ?? null });
  if (count === 0) throw new GroupGuestNotFoundError();

  return getGroupById(groupId);
}
