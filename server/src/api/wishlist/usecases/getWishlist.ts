import type { Wishlist } from '../wishlist.types';

const wishlistRepo = require('../wishlist.repository');

interface RepoWishlistItem {
  slot: string;
  itemId: number | null;
  itemName?: string;
  icon?: string;
  ilvl?: number;
  quality?: string;
  priority: number;
}

export async function getWishlist(
  characterId: number,
  specializationId: number,
): Promise<Wishlist> {
  const wishlistItems: RepoWishlistItem[] = await wishlistRepo.getCharacterWishlist(
    characterId,
    specializationId,
  );

  const wishlistObj: Wishlist = {};

  wishlistItems.forEach((item) => {
    wishlistObj[item.slot] = {
      itemId: item.itemId,
      itemName: item.itemName,
      icon: item.icon,
      ilvl: item.ilvl,
      quality: item.quality,
      priority: item.priority,
    };
  });

  return wishlistObj;
}
