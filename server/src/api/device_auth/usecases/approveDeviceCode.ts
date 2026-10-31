/**
 * Ce que la page /device fait : inspecter une demande en attente, puis
 * l'approuver pour un ou plusieurs royaumes.
 */

import createError from 'http-errors';

import { prisma } from '../../../data';
import realmRepo from '../../realm/realm.repository';
import { normalizeUserCode } from '../device_auth.codes';
import { ADMIN_ROLES, SYNC_LOOT_SCOPE } from '../device_auth.constants';
import { assertDeviceCodeUsable } from '../device_auth.guards';
import repo from '../device_auth.repository';
import type { PendingApproval } from '../device_auth.types';

async function readPendingCode(userCode: string) {
  const code = await repo.findByUserCode(normalizeUserCode(userCode));
  if (!code) throw createError(404, 'invalid_user_code');

  assertDeviceCodeUsable(code, { rejectApproved: true });

  return code;
}

export async function describePendingApproval({
  userCode,
  userId,
}: {
  userCode: string;
  userId: string;
}): Promise<PendingApproval> {
  const code = await readPendingCode(userCode);

  const ownerships = await prisma.realm_owners.findMany({
    where: { ownerId: String(userId) },
    include: { realm: { select: { id: true, guildName: true } } },
  });

  const eligible = ownerships.filter((o) => ADMIN_ROLES.has(o.role || 'admin'));

  return {
    deviceName: code.deviceName,
    expiresAt: code.expiresAt,
    eligibleRealms: eligible.map((o) => ({
      id: o.realm.id,
      guildName: o.realm.guildName,
      role: o.role || 'admin',
    })),
  };
}

export async function approveDeviceCode({
  userCode,
  userId,
  realmIds,
}: {
  userCode: string;
  userId: string;
  realmIds: number[];
}): Promise<{ ok: true }> {
  const code = await readPendingCode(userCode);

  if (!Array.isArray(realmIds) || realmIds.length === 0) {
    throw createError(400, 'realm_ids_required');
  }

  // L'appairage est vérifié royaume par royaume : approuver pour un royaume
  // où l'on n'est pas responsable doit échouer, même si on l'est ailleurs.
  for (const realmId of realmIds) {
    const role = await realmRepo.getRealmUserRole(realmId, userId);
    if (!role || !ADMIN_ROLES.has(role)) {
      throw createError(403, `not_authorized_on_realm_${realmId}`);
    }
  }

  await repo.approveDeviceCode(code.id, {
    userId,
    scopes: [SYNC_LOOT_SCOPE, ...realmIds.map((id) => `realm:${id}`)],
  });

  return { ok: true };
}
