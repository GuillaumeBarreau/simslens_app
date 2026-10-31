const repository = require('../wishlist.repository');

export interface RosterHiddenSpecWishlists {
  character: { id: number; name: string; class: string; specializationId: number | null };
  /** Spé dont la vue roster montre la wishlist. */
  displayedSpecializationId: number;
  hiddenSpecializations: {
    id: number;
    name: string | null;
    itemCount: number;
    /** Spé déclarée comme off-spec par le joueur (SIMS-212). */
    isDeclaredOffSpec: boolean;
  }[];
}

/**
 * Wishlists des autres spés que celle affichée par la vue roster, pour les
 * signaler au lieu de les masquer en silence (SIMS-212).
 * @param realmId royaume vérifié par checkPermission
 */
export async function getRosterHiddenSpecWishlists(
  realmId: number,
): Promise<RosterHiddenSpecWishlists[]> {
  return repository.getRosterHiddenSpecWishlists(realmId);
}
