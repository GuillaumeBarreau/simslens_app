import type { ItemEntity } from './item_listed.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const itemRepository: {
  findItemById(id: number): Promise<ItemEntity | null>;
};

export default itemRepository;
