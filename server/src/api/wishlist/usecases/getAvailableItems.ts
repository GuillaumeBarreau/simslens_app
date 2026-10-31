import createError from 'http-errors';

import { VALID_SLOTS } from '../../../shared/constants/wow';
import wishlistRepo from '../wishlist.repository';
import type { Item } from '../wishlist.types';

export async function getAvailableItems(
  slot: string,
  extension: string,
  season: string,
  classId: number | null = null,
  specName: string | null = null,
): Promise<Item[]> {
  if (!VALID_SLOTS.includes(slot)) {
    throw createError(400, `Invalid slot: ${slot}`);
  }

  const items = await wishlistRepo.getAvailableItemsForSlot(
    slot,
    extension,
    season,
    classId,
    specName,
  );
  return items;
}
