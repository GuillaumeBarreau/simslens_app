const { VALID_SLOTS } = require('../../shared/constants/wow');

/**
 * Emplacements d'une liste BiS Forever : ceux de la wishlist, plus l'emplacement à
 * distance (arcs, baguettes, reliques…) que Retail n'a plus.
 */
export const BIS_SLOTS: readonly string[] = [...(VALID_SLOTS as string[]), 'ranged'];

/** Objets par emplacement : le BiS et quelques alternatives. */
export const MAX_ITEMS_PER_SLOT = 5;
