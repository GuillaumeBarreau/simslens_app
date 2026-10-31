import createError from 'http-errors';

import realmRepo from './realm.repository';
import type { RealmEntity, RealmOwner } from './realm.types';

/** Seul ce rôle administre les accès du royaume. */
const OWNER_ROLE = 'owner';

/**
 * @throws 404 si le royaume n'existe pas
 */
export async function assertRealmExists(realmId: number): Promise<RealmEntity> {
  const realm = await realmRepo.getRealmById(realmId);
  if (!realm) throw createError(404, 'Realm not found');

  return realm;
}

/**
 * Vérifie que l'appelant figure parmi les responsables du royaume, quel que
 * soit son rôle.
 *
 * @param action complète le message d'erreur, ex. « view realm owners »
 * @throws 403 si l'appelant n'est pas responsable
 */
export async function assertRequesterIsStaff(
  realmId: number,
  requesterId: string,
  action: string,
): Promise<RealmOwner> {
  const requesterOwner = await realmRepo.getRealmOwner(realmId, requesterId);
  if (!requesterOwner) {
    throw createError(403, `Not authorized to ${action}`);
  }

  return requesterOwner;
}

/**
 * Vérifie que l'appelant est propriétaire — un admin ou un modérateur ne
 * suffit pas pour modifier les accès.
 *
 * @param action complète le message d'erreur, ex. « add administrators »
 * @throws 403 si l'appelant n'est pas propriétaire
 */
export async function assertRequesterIsOwner(
  realmId: number,
  requesterId: string,
  action: string,
): Promise<RealmOwner> {
  const requesterOwner = await realmRepo.getRealmOwner(realmId, requesterId);
  if (!requesterOwner || requesterOwner.role !== OWNER_ROLE) {
    throw createError(403, `Only realm owners can ${action}`);
  }

  return requesterOwner;
}
