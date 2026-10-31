const repository = require('../wishlist.repository');

export interface WishlistCompletionMap {
  [characterId: number]: { normal: number; heroic: number; mythic: number };
}

export async function getRosterWishlistCompletion(realmId: number): Promise<WishlistCompletionMap> {
  return repository.getRosterWishlistCompletion(realmId);
}
