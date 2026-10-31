import type { dungeon_availabilities } from '@prisma/client';

export type AvailabilityEntity = dungeon_availabilities;

export interface ListAvailabilitiesFilters {
  realmId: AvailabilityEntity['realmId'];
  userId?: AvailabilityEntity['userId'];
  startDate?: Date;
  endDate?: Date;
}

export interface CreateAvailabilityInput {
  userId: AvailabilityEntity['userId'];
  realmId: AvailabilityEntity['realmId'];
  date: Date;
  startTime: AvailabilityEntity['startTime'];
  endTime: AvailabilityEntity['endTime'];
  type: AvailabilityEntity['type'];
  /** Tableau de rôles sérialisé en JSON (cf. schema.prisma). */
  roles: AvailabilityEntity['roles'];
  note?: AvailabilityEntity['note'];
}

export type UpdateAvailabilityInput = Partial<Omit<CreateAvailabilityInput, 'userId' | 'realmId'>>;

/**
 * Portée d'un appel. `realmRole` permet aux responsables du royaume de
 * toucher au créneau d'un autre membre.
 */
export interface AvailabilityScope {
  realmId: AvailabilityEntity['realmId'];
  userId?: AvailabilityEntity['userId'];
  realmRole?: string;
}
