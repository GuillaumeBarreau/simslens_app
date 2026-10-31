import type { realms } from '@prisma/client';

export type RealmEntity = realms;

export interface CreateRealmInput {
  name: string;
  server: string;
  region: string;
  ownerId: string;
  /** Jeton Battle.net du créateur, requis pour vérifier la guilde (sinon 401). */
  userToken?: string;
}

export interface CreateRealmResult {
  id: number;
  name: string;
  server: string;
  region: string;
}

export interface RealmOwner {
  id: number;
  realmId: number;
  ownerId: string;
  role: string;
}

export interface RealmSettings {
  discordGuildId?: string | null;
  signupLockHours?: number | null;
  /** Second rappel, en heures avant le début du raid ; 0 = désactivé. */
  confirmReminderHours?: number | null;
  /** Fuseau IANA des messages Discord (« Europe/Paris »). */
  timezone?: string;
  [key: string]: unknown;
}

export interface UserPermissions {
  role: string | null;
  permissions: string[];
}
