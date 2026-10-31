import createError from 'http-errors';

import repo from '../device_auth.repository';
import type { DeviceTokenRecord } from '../device_auth.types';

export async function listTokens(userId: string): Promise<DeviceTokenRecord[]> {
  return repo.listTokensByUser(userId);
}

/**
 * La révocation est portée par l'identifiant du membre : personne ne révoque
 * le jeton d'un autre.
 */
export async function revokeToken(id: number, userId: string): Promise<{ ok: true }> {
  const result = await repo.revokeToken(id, userId);
  if (result.count === 0) throw createError(404, 'token_not_found');

  return { ok: true };
}
