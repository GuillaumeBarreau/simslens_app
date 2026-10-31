/**
 * Gestion des responsables d'un royaume. Seul un propriétaire peut y
 * toucher, et jamais à son propre accès : il faut un autre propriétaire pour
 * le rétrograder, ce qui évite qu'un royaume se retrouve sans responsable.
 */

import createError from 'http-errors';

import { assertRealmExists, assertRequesterIsOwner, assertRequesterIsStaff } from '../realm.access';
import { REALM_OWNER_ROLES } from '../realm.constants';
import realmRepo from '../realm.repository';
import type { RealmOwner } from '../realm.types';

function assertValidRole(role: string): void {
  if (!REALM_OWNER_ROLES.includes(role)) {
    throw createError(400, 'Invalid role. Must be owner, admin or moderator');
  }
}

export async function getRealmOwners(realmId: number, requesterId: string): Promise<RealmOwner[]> {
  await assertRealmExists(realmId);
  await assertRequesterIsStaff(realmId, requesterId, 'view realm owners');

  return realmRepo.getRealmOwners(realmId);
}

export async function addRealmOwner(
  realmId: number,
  ownerId: string,
  role: string,
  requesterId: string,
): Promise<{ success: true }> {
  await assertRealmExists(realmId);
  await assertRequesterIsOwner(realmId, requesterId, 'add administrators');
  assertValidRole(role);

  const existing = await realmRepo.getRealmOwner(realmId, ownerId);
  if (existing) {
    throw createError(409, 'User is already an owner/admin of this realm');
  }

  await realmRepo.addRealmOwner(realmId, ownerId, role);

  return { success: true };
}

export async function removeRealmOwner(
  realmId: number,
  ownerId: string,
  requesterId: string,
): Promise<{ success: true }> {
  await assertRealmExists(realmId);
  await assertRequesterIsOwner(realmId, requesterId, 'remove administrators');

  if (ownerId === requesterId) {
    throw createError(400, 'Vous ne pouvez pas supprimer votre propre accès administrateur');
  }

  const changes = await realmRepo.removeRealmOwner(realmId, ownerId);
  if (changes === 0) {
    throw createError(404, 'Owner not found');
  }

  return { success: true };
}

export async function updateRealmOwnerRole(
  realmId: number,
  ownerId: string,
  role: string,
  requesterId: string,
): Promise<{ success: true }> {
  await assertRealmExists(realmId);
  await assertRequesterIsOwner(realmId, requesterId, 'modify roles');
  assertValidRole(role);

  if (ownerId === requesterId) {
    throw createError(400, 'Vous ne pouvez pas modifier votre propre rôle');
  }

  const changes = await realmRepo.updateRealmOwnerRole(realmId, ownerId, role);
  if (changes === 0) {
    throw createError(404, 'Owner not found');
  }

  return { success: true };
}

export async function getRealmUsers(realmId: number, requesterId: string): Promise<unknown[]> {
  await assertRealmExists(realmId);
  await assertRequesterIsStaff(realmId, requesterId, 'view realm users');

  return realmRepo.getRealmUsers(realmId);
}
