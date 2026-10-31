import type { realm_invite_codes, realm_user_guests } from '@prisma/client';

export type InviteCodeEntity = realm_invite_codes;
export type GuestMemberEntity = realm_user_guests;

export interface GuestCharacterRecord {
  userId: string | null;
  name: string;
  class: string;
  realm: string;
  realmId: number | null;
  lastModified: Date;
}

export interface GuestCharacterSummary {
  name: string;
  class: string;
  realm: string;
}

export interface GuestMemberView extends GuestMemberEntity {
  character: GuestCharacterSummary | null;
}

export interface CreateInviteCodeOptions {
  expiresAt?: Date | null;
  maxUses?: number;
}

/** Royaume tel qu'exposé au client lors de la validation d'un code. */
export interface InviteRealmSummary {
  id: number;
  guildName: string;
  server: string;
  region: string;
}

export type InviteRejectionReason = 'invalid_code' | 'expired' | 'max_uses_reached';

export type ValidateInviteResult =
  { valid: false; reason: InviteRejectionReason } | { valid: true; realm: InviteRealmSummary };

export interface JoinRealmResult {
  alreadyMember: boolean;
  realm: InviteRealmSummary;
}

/** Issues possibles de la transaction d'adhésion, côté repository. */
export type ConsumeInviteStatus =
  InviteRejectionReason | 'already_owner' | 'already_member' | 'already_guest' | 'joined';

export interface ConsumeInviteResult {
  status: ConsumeInviteStatus;
  realm?: InviteRealmSummary;
}
