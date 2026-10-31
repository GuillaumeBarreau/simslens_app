import type { WowRegion } from './common.types';

/**
 * A WoW character as returned by the Blizzard API (using string class name).
 */
export interface BlizzardCharacter {
  name: string;
  realm: string;
  class: string;
  level: number;
  region?: WowRegion | string;
}

/**
 * A guild member as returned by the Blizzard guild roster API.
 * The Blizzard API returns a numeric `classId`, not a class name string.
 */
export interface BlizzardGuildMember {
  name: string;
  realm: string;
  /** Blizzard numeric class ID (1 = Warrior, 2 = Paladin, etc.) */
  classId: number;
  /** Class name as string (may be present after server-side mapping) */
  class?: string;
  level: number;
  /** Guild rank (0 = guild master) */
  rank: number;
  region?: WowRegion | string;
}

export interface BlizzardImportPayload {
  members: BlizzardGuildMember[];
  region?: string;
  realmId?: number;
}

export interface GuildValidatePayload {
  realm: string;
  guild: string;
  region?: string;
}

export interface BlizzardImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors?: string[];
  /** Array of all processed member records (length = total processed) */
  details: unknown[];
}
