/**
 * L'opération est atomique côté repository : le plafond maxUses est tenu
 * même en cas d'adhésions simultanées, et aucun invité n'est créé pour un
 * utilisateur déjà propriétaire ou membre du royaume.
 */

import createError from 'http-errors';

import repo from '../invite.repository';
import type { JoinRealmResult } from '../invite.types';

export async function joinRealmAsGuest(code: string, userId: string): Promise<JoinRealmResult> {
  const result = await repo.consumeInviteAndAddGuest(code, userId);

  switch (result.status) {
    case 'invalid_code':
      throw createError(404, 'Invalid invite code');
    case 'expired':
      throw createError(410, 'This invite code has expired');
    case 'max_uses_reached':
      throw createError(410, 'This invite code has already been used');
    case 'already_owner':
    case 'already_member':
    case 'already_guest':
    case 'joined': {
      const realm = result.realm!;
      return {
        alreadyMember: result.status !== 'joined',
        realm: {
          id: realm.id,
          guildName: realm.guildName,
          server: realm.server,
          region: realm.region,
        },
      };
    }
    default:
      throw createError(500, 'Unexpected invite state');
  }
}
