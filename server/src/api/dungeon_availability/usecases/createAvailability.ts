import availabilityRepo from '../dungeon_availability.repository';
import type { AvailabilityEntity, CreateAvailabilityInput } from '../dungeon_availability.types';

export async function createAvailability(
  input: CreateAvailabilityInput,
): Promise<AvailabilityEntity> {
  console.log('[Dungeon Availability Service] Creating availability:', {
    userId: input.userId,
    realmId: input.realmId,
    date: input.date,
    type: input.type,
    roles: input.roles,
  });

  return availabilityRepo.create(input);
}
