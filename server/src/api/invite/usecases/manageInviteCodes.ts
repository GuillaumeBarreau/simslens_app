/**
 * Cycle de vie des codes d'invitation d'un royaume. Le droit d'y toucher
 * est vérifié au niveau des routes (MANAGE_REALM).
 */

import createError from 'http-errors';

import repo from '../invite.repository';
import type {
  CreateInviteCodeOptions,
  InviteCodeEntity,
  ValidateInviteResult,
} from '../invite.types';

export async function createInviteCode(
  realmId: number,
  createdBy: string,
  options: CreateInviteCodeOptions = {},
): Promise<InviteCodeEntity> {
  return repo.createInviteCode(realmId, createdBy, {
    expiresAt: options.expiresAt,
    maxUses: options.maxUses,
  });
}

export async function listInviteCodes(realmId: number): Promise<InviteCodeEntity[]> {
  return repo.getInviteCodesByRealm(realmId);
}

/**
 * Supprime un code, après s'être assuré qu'il appartient bien au royaume
 * appelant : sans cette vérification, un identifiant suffirait à supprimer
 * le code d'une autre guilde.
 */
export async function deleteInviteCode(realmId: number, codeId: number): Promise<unknown> {
  const codes = await repo.getInviteCodesByRealm(realmId);
  const code = codes.find((c) => c.id === Number(codeId));
  if (!code) throw createError(404, 'Invite code not found');

  return repo.deleteInviteCode(codeId);
}

/**
 * Validation publique d'un code, sans authentification.
 */
export async function validateInviteCode(code: string): Promise<ValidateInviteResult> {
  const record = await repo.getInviteCodeByCode(code);

  if (!record) return { valid: false, reason: 'invalid_code' };

  if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
    return { valid: false, reason: 'expired' };
  }

  if (record.useCount >= record.maxUses) {
    return { valid: false, reason: 'max_uses_reached' };
  }

  return {
    valid: true,
    realm: {
      id: record.realm.id,
      guildName: record.realm.guildName,
      server: record.realm.server,
      region: record.realm.region,
    },
  };
}
