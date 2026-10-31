import createError from 'http-errors';

import { VALID_SLOTS } from '../../../shared/constants/wow';
import { logWishlistUpdate } from '../../activity_log/activity_log.utils';

interface WishlistEntry {
  slot: string;
  itemId: number | null;
}

const wishlistRepo = require('../wishlist.repository');
const { prisma } = require('../../../data');

export async function updateWishlistItem(
  characterId: number,
  specializationId: number,
  slot: string,
  itemId: number | null,
  priority: number,
  userId: string,
): Promise<{ success: boolean }> {
  if (!VALID_SLOTS.includes(slot)) {
    throw createError(400, `Invalid slot: ${slot}`);
  }

  const validSpec = await wishlistRepo.specBelongsToCharacter(characterId, specializationId);
  if (!validSpec) {
    throw createError(400, `Specialization ${specializationId} does not match character class`);
  }

  let oldItemId: number | null = null;
  let characterName = `character#${characterId}`;
  let realmId: number | null = null;

  try {
    const [currentWishlist, character] = await Promise.all([
      wishlistRepo.getCharacterWishlist(characterId, specializationId),
      prisma.characters.findUnique({
        where: { id: characterId },
        select: { name: true, realmId: true },
      }),
    ]);

    const currentSlot = currentWishlist.find((w: WishlistEntry) => w.slot === slot);
    oldItemId = currentSlot?.itemId ?? null;
    if (character) {
      characterName = character.name;
      realmId = character.realmId;
    }
  } catch (_e) {
    // Non-blocking: log fetch failure but don't break the update
  }

  if (itemId === null || itemId === undefined) {
    await wishlistRepo.removeWishlistItem(characterId, specializationId, slot);
  } else {
    await wishlistRepo.setWishlistItem(characterId, specializationId, slot, itemId, priority || 0);
  }

  // Changement de priorité seul (SIMS-205) : l'objet ne change pas, rien à
  // tracer dans l'historique des wishlists.
  if (oldItemId !== null && oldItemId === (itemId ?? null)) {
    return { success: true };
  }

  logWishlistUpdate({
    realmId,
    userId,
    characterName,
    slot,
    characterId,
    specializationId,
    oldItemId,
    newItemId: itemId ?? null,
  });

  return { success: true };
}
