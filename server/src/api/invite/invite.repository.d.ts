import type {
  ConsumeInviteResult,
  CreateInviteCodeOptions,
  GuestCharacterRecord,
  GuestMemberEntity,
  InviteCodeEntity,
  InviteRealmSummary,
} from './invite.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

/** Un code lu par son libellé porte le royaume associé. */
export interface InviteCodeWithRealm extends InviteCodeEntity {
  realm: InviteRealmSummary;
}

declare const inviteRepository: {
  createInviteCode(
    realmId: number,
    createdBy: string,
    options: CreateInviteCodeOptions,
  ): Promise<InviteCodeEntity>;
  getInviteCodesByRealm(realmId: number): Promise<InviteCodeEntity[]>;
  getInviteCodeByCode(code: string): Promise<InviteCodeWithRealm | null>;
  deleteInviteCode(codeId: number): Promise<unknown>;
  incrementUseCount(codeId: number): Promise<unknown>;
  consumeInviteAndAddGuest(code: string, userId: string): Promise<ConsumeInviteResult>;
  addGuestMember(realmId: number, userId: string): Promise<GuestMemberEntity>;
  getGuestMember(guestId: number): Promise<GuestMemberEntity | null>;
  getGuestMembersByRealm(realmId: number): Promise<GuestMemberEntity[]>;
  removeGuestMember(guestId: number): Promise<unknown>;
  getCharactersByUserIds(userIds: string[], realmId: number): Promise<GuestCharacterRecord[]>;
  getGuestMembershipsByUserId(userId: string): Promise<GuestMemberEntity[]>;
};

export default inviteRepository;
