import type {
  DateString,
  DungeonGroupStatus,
  DungeonRole,
  DungeonType,
  ID,
  ISODate,
  TimeString,
} from './common.types';

/**
 * Mirrors the `dungeon_availabilities` Prisma model.
 * `roles` is stored as a raw JSON string in the DB, e.g. '["TANK","DPS"]'.
 * Use JSON.parse(availability.roles) to get the array in components.
 */
export interface DungeonAvailability {
  id: ID;
  userId: string;
  realmId: ID;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  type: DungeonType;
  /** Raw JSON string, e.g. '["TANK","DPS"]'. Parse before use. */
  roles: string;
  note?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateDungeonAvailabilityPayload {
  realmId: ID;
  date: DateString;
  startTime: TimeString;
  endTime: TimeString;
  type: DungeonType;
  /** Roles array, e.g. ["TANK", "DPS"] */
  roles: string[];
  note?: string;
}

export interface UpdateDungeonAvailabilityPayload {
  date?: DateString;
  startTime?: TimeString;
  endTime?: TimeString;
  type?: DungeonType;
  /** Roles array, e.g. ["TANK", "DPS"] */
  roles?: string[];
  note?: string;
}

export interface DungeonAvailabilityFilters {
  realmId: ID;
  userId?: string;
  startDate?: DateString;
  endDate?: DateString;
}

export interface DungeonGroupMember {
  id: ID;
  groupId: ID;
  userId: string;
  role: DungeonRole;
}

export interface DungeonGroupGuest {
  id: ID;
  groupId: ID;
  realmId: ID;
  name: string;
  role: DungeonRole;
  class?: string | null;
  addedBy?: string | null;
  slotId?: string | null;
  createdAt: ISODate;
}

export interface DungeonGroup {
  id: ID;
  realmId: ID;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  type: DungeonType;
  note?: DungeonRole;
  status: DungeonGroupStatus;
  createdBy: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  members: DungeonGroupMember[];
  guests: DungeonGroupGuest[];
}

export interface AddDungeonGroupGuestPayload {
  name: string;
  role: DungeonRole;
  class?: string;
}

export interface CreateDungeonGroupPayload {
  realmId: ID;
  date: DateString;
  startTime: TimeString;
  endTime: TimeString;
  type: DungeonType;
  note?: string;
}

export interface UpdateDungeonGroupPayload {
  startTime?: TimeString;
  endTime?: TimeString;
  type?: DungeonType;
  note?: string;
  status?: DungeonGroupStatus;
}
