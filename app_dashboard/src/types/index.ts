export interface Specialization {
  id: number;
  name: string;
  role: 'tank' | 'healer' | 'dps';
  icon?: string;
  classId?: number;
}

export interface Subscription {
  id: number;
  realmId: number;
  tier: number;
  type: 'monthly' | 'annual';
  status: 'active' | 'expired' | 'cancelled';
  price: string;
  startedAt: string;
  expiresAt: string;
  note?: string | null;
  createdAt: string;
}

export interface Realm {
  id: number;
  server: string;
  region: string;
  guildName: string;
  tier: number;
  discordGuildId?: string;
}

export interface Character {
  id: number;
  name: string;
  class: string;
  realm: string;
  region: string;
  thumbnail?: string;
  spec?: string;
  ilvl?: number;
  score?: number;
  status: 'approved' | 'pending';
  archived: number;
  archivedAt?: string;
  discordTag?: string;
  realmId?: number;
  specialization?: Specialization;
}

export type Page = 'dashboard' | 'guilds';
