/**
 * Plus de `features` dérivées d'un palier d'abonnement : toute fonctionnalité
 * livrée est accessible à toutes les guildes. Le masquage des fonctionnalités
 * en cours de développement se fait côté front, via
 * app/src/config/featureFlags.ts.
 */

import { PERMISSIONS_BY_ROLE } from '../../../shared/realmRolePermissions';
import { assertRealmExists } from '../realm.access';
import realmRepo from '../realm.repository';

export async function getUserPermissions(
  realmId: number,
  requesterId: string,
): Promise<{ role: string | null; permissions: unknown }> {
  await assertRealmExists(realmId);

  const role = await realmRepo.getRealmUserRole(realmId, requesterId);

  return { role, permissions: role ? (PERMISSIONS_BY_ROLE[role] ?? {}) : {} };
}
