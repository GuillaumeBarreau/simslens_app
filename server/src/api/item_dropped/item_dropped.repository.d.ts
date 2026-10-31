import type { CreateLootInput, ListLootsFilters, LootEntity, LootRow } from './item_dropped.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 *
 * Les alias getByInstanceId/getById/insert/updateById/removeById existent
 * aussi mais ne sont utilisés nulle part : ils ne sont pas déclarés ici.
 */
declare const lootRepository: {
  listInstanceLootsByInstanceId(instanceId: number, filters?: ListLootsFilters): Promise<LootRow[]>;
  findInstanceLootById(lootId: number): Promise<LootEntity | null>;
  createInstanceLoot(data: CreateLootInput): Promise<LootEntity>;
  updateInstanceLootById(lootId: number, data: Partial<LootEntity>): Promise<unknown>;
  deleteInstanceLootById(lootId: number): Promise<unknown>;
};

export default lootRepository;
