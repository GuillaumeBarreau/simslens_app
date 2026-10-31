import { LootNotFoundError } from '../item_dropped.errors';
import lootRepository from '../item_dropped.repository';
import type { CreateLootInput, LootEntity } from '../item_dropped.types';

export async function createLoot(payload: CreateLootInput): Promise<LootEntity> {
  return lootRepository.createInstanceLoot(payload);
}

/**
 * Attribue un butin, ou le libère lorsque assignedTo vaut null.
 *
 * assignedAt sert de trace : la date de l'attribution, pas celle du drop.
 * Sans auteur connu, assignedBy vaut 0.
 */
export async function assignLoot(
  lootId: number,
  assignedTo: number | null,
  assignedBy?: number | null,
): Promise<LootEntity> {
  await lootRepository.updateInstanceLootById(lootId, {
    assignedTo,
    assignedBy: assignedBy || 0,
    assignedAt: new Date(),
  });

  const loot = await lootRepository.findInstanceLootById(lootId);
  if (!loot) {
    throw new LootNotFoundError(lootId);
  }

  return loot;
}

export async function removeLoot(lootId: number): Promise<void> {
  await lootRepository.deleteInstanceLootById(lootId);
}
