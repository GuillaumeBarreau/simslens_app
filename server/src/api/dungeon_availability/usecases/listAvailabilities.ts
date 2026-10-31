import { AvailabilityNotFoundError } from '../dungeon_availability.errors';
import availabilityRepo from '../dungeon_availability.repository';
import type { AvailabilityEntity, ListAvailabilitiesFilters } from '../dungeon_availability.types';

export async function listAvailabilities(
  filters: ListAvailabilitiesFilters,
): Promise<AvailabilityEntity[]> {
  return availabilityRepo.findAll(filters);
}

export async function getAvailabilityById(id: number): Promise<AvailabilityEntity | null> {
  return availabilityRepo.findById(id);
}

/**
 * Lecture restreinte au royaume de l'appelant.
 * @throws {AvailabilityNotFoundError} s'il n'existe pas ou sort de la portée
 */
export async function getAvailabilityForRealm(
  id: number,
  realmId: number,
): Promise<AvailabilityEntity> {
  const hasAccess = await availabilityRepo.belongsToRealm(id, realmId);
  const availability = hasAccess ? await availabilityRepo.findById(id) : null;
  if (!availability) throw new AvailabilityNotFoundError();

  return availability;
}
