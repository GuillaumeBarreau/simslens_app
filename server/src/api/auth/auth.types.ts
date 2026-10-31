import type { characters } from '@prisma/client';

export interface SessionUser {
  id: string;
  battletag?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface GuestRealm {
  id: number;
  guildName: string;
  server: string;
  region: string;
  joinedAt: Date;
}

export interface UserProfile extends SessionUser {
  linkedCharacters: characters[];
  mainCharacter: characters | null;
  guestRealms: GuestRealm[];
}
