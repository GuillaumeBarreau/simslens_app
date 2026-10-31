/**
 * L'appareil scrute ce point d'entrée avec son code technique. Tant que
 * l'utilisateur n'a pas approuvé, la réponse est 428 ; une fois approuvé,
 * le code est consommé et le jeton délivré une seule fois.
 */

import createError from 'http-errors';

import { hashToken } from '../../../middleware/authBearer';
import { generateAccessToken, TOKEN_TTL_MS } from '../device_auth.codes';
import { assertDeviceCodeUsable } from '../device_auth.guards';
import repo from '../device_auth.repository';
import type { DeviceAccessToken } from '../device_auth.types';

export async function exchangeDeviceCode({
  deviceCode,
}: {
  deviceCode: string;
}): Promise<DeviceAccessToken> {
  const code = await repo.findByDeviceCode(deviceCode);
  if (!code) throw createError(404, 'invalid_device_code');

  assertDeviceCodeUsable(code);

  if (!code.approvedAt || !code.userId) {
    throw createError(428, 'authorization_pending');
  }

  const rawToken = generateAccessToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await repo.createToken({
    userId: code.userId,
    name: code.deviceName ? `Desktop - ${code.deviceName}` : 'Desktop',
    // Seule l'empreinte est stockée : le jeton en clair ne quitte pas cette réponse.
    tokenHash: hashToken(rawToken),
    scopes: code.scopes,
    expiresAt,
  });

  await repo.markDeviceCodeConsumed(code.id);

  return {
    accessToken: rawToken,
    tokenType: 'Bearer',
    expiresAt: expiresAt.toISOString(),
    scopes: code.scopes,
  };
}
