import type { raid_signups, SignupStatus } from '@prisma/client';

export type SignupEntity = raid_signups;
export type { SignupStatus };

export interface SignupCharacter {
  id: number;
  name: string | null;
  class: string | null;
  spec: string | null;
  userId: string | null;
  specialization?: { name: string } | null;
}

export interface UpsertSignupInput {
  eventId: number;
  characterId: number;
  status: SignupStatus;
  role?: string | null;
  lateTime?: string | null;
  absenceReason?: string | null;
}

export type RosterByRole = Record<string, unknown>;
