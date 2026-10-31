import type { Specialization } from './character.types';
import type { ID, WowRegion } from './common.types';

/**
 * A WoW character linked to the authenticated user's Battle.net account.
 * Returned by `/auth/me` inside `linkedCharacters`.
 */
export interface LinkedCharacter {
  id: ID;
  name: string;
  class: string;
  realm: string;
  region?: WowRegion | string | null;
  thumbnail?: string | null;
  guildName?: string;
  realmId?: ID | null;
  spec?: string | null;
  specializationId?: ID | null;
  specialization?: Specialization;
  ilvl?: number | null;
  score?: number | null;
}

export interface GuestRealm {
  id: number;
  guildName: string;
  server: string;
  region: string;
  joinedAt: string;
}

/**
 * Authenticated Battle.net user, as returned by `/auth/me`.
 */
export interface User {
  id: string | number;
  battletag?: string;
  provider?: 'bnet';
  linkedCharacters?: LinkedCharacter[];
  guestRealms?: GuestRealm[];
}
