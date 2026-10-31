import { ForbiddenError } from '../../../shared/errors/AppError';
import instanceRepository from '../../instance/instance.repository';
import { LootNotFoundError } from '../item_dropped.errors';
import lootRepository from '../item_dropped.repository';
import type { ListLootsFilters, LootEntity, LootWithStatus } from '../item_dropped.types';

/**
 * Butins d'une instance, enrichis de l'indicateur « en attente d'attribution ».
 * (Le vote se fait dans l'addon en jeu, plus dans l'application : SIMS-149.)
 *
 * Avec un `realmId`, l'instance doit appartenir à ce royaume : sinon, ou si
 * elle n'existe pas, ForbiddenError (sans révéler laquelle des deux).
 */
export async function listInstanceLoots(
  instanceId: number,
  filters: ListLootsFilters = {},
  realmId?: number,
): Promise<LootWithStatus[]> {
  if (realmId) {
    const instance = await instanceRepository.findInstanceById(instanceId);
    if (!instance || instance.realmId !== realmId) {
      throw new ForbiddenError();
    }
  }

  const loots = await lootRepository.listInstanceLootsByInstanceId(instanceId, filters);

  return loots.map((loot) => ({
    ...loot,
    isPending: !loot.assignedTo,
  }));
}

export async function getLoot(lootId: number): Promise<LootEntity> {
  const loot = await lootRepository.findInstanceLootById(lootId);
  if (!loot) {
    throw new LootNotFoundError(lootId);
  }

  return loot;
}
