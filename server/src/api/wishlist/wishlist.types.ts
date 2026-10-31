export interface Item {
  id: number;
  name: string;
  icon: string;
  quality: number;
  itemLevel: number;
  inventoryType: number | null;
  itemClass: number | null;
  itemSubClass: number | null;
  allowableClasses: string | null;
  bossName?: string;
}

export interface WishlistItem {
  itemId: number | null;
  itemName?: string;
  icon?: string;
  ilvl?: number;
  quality?: string;
  priority: number;
}

export interface Wishlist {
  [slot: string]: WishlistItem;
}

export interface UpdateWishlistItemInput {
  itemId: number | null;
  priority: number;
  specializationId: number;
}

export interface CopyWishlistFromCharacterInput {
  targetSpecializationId: number;
  sourceSpecializationId: number;
}

export interface GetAvailableItemsInput {
  slot: string;
  extension: string;
  season: string;
  classId?: number | null;
}

/** Query de GET /characters/:id/wishlist/status (SIMS-205). */
export interface WishlistStatusQuery {
  specializationId: number;
  difficulty: string;
}

/** Query de GET /characters/:id/wishlist/:slot/alternatives (SIMS-205). */
export interface WishlistSlotAlternativesQuery extends WishlistStatusQuery {
  extension: string;
  season: string;
}

export interface WishlistCopyResult {
  success: boolean;
  count: number;
}
