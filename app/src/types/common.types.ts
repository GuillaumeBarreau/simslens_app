/** Numeric database primary key */
export type ID = number;

/** String-based user / Discord identifier */
export type StringID = string;

/** ISO 8601 date-time string, e.g. "2024-01-01T20:00:00.000Z" */
export type ISODate = string;

/** Time string in HH:MM format, e.g. "20:00" */
export type TimeString = string;

/** Date string in YYYY-MM-DD format, e.g. "2024-01-01" */
export type DateString = string;

/** Raid role (4-way split used by the roster system) */
export type WowRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';

export type DpsRole = 'MELEE' | 'RANGED';

/** Role used in dungeon groups (tanks + healers share a slot with DPS) */
export type DungeonRole = 'TANK' | 'HEALER' | 'DPS';

export type DungeonType = 'M0' | 'M+';

export type WowRegion = 'EU' | 'US' | 'KR' | 'TW';

export type DungeonGroupStatus = 'DRAFT' | 'CONFIRMED';

export type RealmOwnerRole = 'owner' | 'admin' | 'moderator';

export type InstanceStatus = 'ONGOING' | 'COMPLETED';
