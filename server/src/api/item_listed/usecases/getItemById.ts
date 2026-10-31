import { ItemNotFoundError } from '../item_listed.errors';
import itemRepository from '../item_listed.repository';
import type { ItemEntity } from '../item_listed.types';

export async function getItemById(itemId: number): Promise<ItemEntity> {
  const item = await itemRepository.findItemById(itemId);
  if (!item) {
    throw new ItemNotFoundError(itemId);
  }

  return item;
}
