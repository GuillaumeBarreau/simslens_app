import type { BlizzardItemData, ItemEntity } from './item.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const itemRepository: {
  findById(id: number): Promise<ItemEntity | null>;
  create(data: BlizzardItemData): Promise<ItemEntity>;
  update(id: number, data: Partial<BlizzardItemData>): Promise<ItemEntity>;
};

export default itemRepository;
