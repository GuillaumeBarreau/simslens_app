import createError from 'http-errors';

import characterRepo from '../../character/character.repository';
import wishlistRepo from '../wishlist.repository';

/**
 * checkPermission vérifie le royaume du personnage cible ; le source doit
 * appartenir au même royaume, sans quoi la copie servirait à lire la wishlist
 * d'un personnage d'une autre guilde (SIMS-173).
 */
export async function copyWishlistFromCharacter(
  targetCharId: number,
  targetSpecId: number,
  sourceCharId: number,
  sourceSpecId: number,
  realmId: number,
) {
  const source = await characterRepo.findCharacterById(sourceCharId);
  if (!source || source.realmId !== realmId) {
    throw createError(403, 'Source character is not in this realm');
  }

  const validTarget = await wishlistRepo.specBelongsToCharacter(targetCharId, targetSpecId);
  if (!validTarget) {
    throw createError(400, `Target specialization ${targetSpecId} does not match character class`);
  }

  const validSource = await wishlistRepo.specBelongsToCharacter(sourceCharId, sourceSpecId);
  if (!validSource) {
    throw createError(400, `Source specialization ${sourceSpecId} does not match character class`);
  }

  return wishlistRepo.copyWishlistFromCharacter(
    targetCharId,
    targetSpecId,
    sourceCharId,
    sourceSpecId,
  );
}
