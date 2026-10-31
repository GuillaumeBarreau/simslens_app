import { AvailabilityNotFoundError } from '../dungeon_availability.errors';
import availabilityRepo from '../dungeon_availability.repository';
import type { AvailabilityEntity, AvailabilityScope } from '../dungeon_availability.types';

export async function removeAvailability(id: number): Promise<AvailabilityEntity> {
  console.log('[Dungeon Availability Service] Removing availability:', id);
  return availabilityRepo.remove(id);
}

/**
 * Suppression d'un créneau appartenant à l'appelant.
 * @throws {AvailabilityNotFoundError} s'il sort de la portée
 */
export async function removeAvailabilityForRealm(
  id: number,
  { realmId, userId }: AvailabilityScope,
): Promise<AvailabilityEntity> {
  const hasAccess = await availabilityRepo.belongsToRealm(id, realmId, userId);
  if (!hasAccess) throw new AvailabilityNotFoundError();

  return removeAvailability(id);
}
