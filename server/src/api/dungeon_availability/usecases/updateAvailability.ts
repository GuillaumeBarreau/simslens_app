import { REALM_ROLES_EDITING_ANY } from '../dungeon_availability.constants';
import { AvailabilityNotFoundError } from '../dungeon_availability.errors';
import availabilityRepo from '../dungeon_availability.repository';
import type {
  AvailabilityEntity,
  AvailabilityScope,
  UpdateAvailabilityInput,
} from '../dungeon_availability.types';

export async function updateAvailability(
  id: number,
  data: UpdateAvailabilityInput,
): Promise<AvailabilityEntity> {
  console.log('[Dungeon Availability Service] Updating availability:', { id, data });
  return availabilityRepo.update(id, data);
}

/**
 * Modification d'un créneau que l'appelant a le droit de toucher.
 *
 * Un membre ne modifie que ses propres créneaux ; les rôles listés dans
 * REALM_ROLES_EDITING_ANY modifient ceux de tout le royaume.
 *
 * @throws {AvailabilityNotFoundError} s'il sort de la portée
 */
export async function updateAvailabilityForRealm(
  id: number,
  { realmId, userId, realmRole }: AvailabilityScope,
  data: UpdateAvailabilityInput,
): Promise<AvailabilityEntity> {
  const canEditAny = REALM_ROLES_EDITING_ANY.includes(realmRole as string);
  const hasAccess = await availabilityRepo.belongsToRealm(id, realmId, canEditAny ? null : userId);
  if (!hasAccess) throw new AvailabilityNotFoundError();

  return updateAvailability(id, data);
}
