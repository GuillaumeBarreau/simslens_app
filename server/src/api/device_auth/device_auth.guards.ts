/**
 * Recevabilité d'un code d'appairage.
 *
 * Les trois points d'entrée qui lisent un code posaient les mêmes
 * questions dans le même ordre.
 */

import createError from 'http-errors';

import type { DeviceCodeRecord } from './device_auth.types';

interface UsabilityOptions {
  /** Refuse un code déjà approuvé — inutile au moment de l'échange. */
  rejectApproved?: boolean;
}

/**
 * @throws 410 expiré ou déjà consommé, 409 déjà approuvé
 */
export function assertDeviceCodeUsable(
  code: DeviceCodeRecord,
  { rejectApproved = false }: UsabilityOptions = {},
): void {
  if (code.expiresAt < new Date()) throw createError(410, 'expired');
  if (code.consumedAt) throw createError(410, 'already_consumed');
  if (rejectApproved && code.approvedAt) throw createError(409, 'already_approved');
}
