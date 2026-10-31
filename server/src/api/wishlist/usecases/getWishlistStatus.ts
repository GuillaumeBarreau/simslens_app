import { findCharacterInRealm } from '../../character/character.access';
import { WishlistSpecializationMismatchError } from '../wishlist.errors';
import type { WishlistStatus } from '../wishlist.insights';
import { buildWishlistStatus } from '../wishlist.insights';
import wishlistRepo from '../wishlist.repository';

/**
 * État des vœux d'une wishlist (SIMS-205) : pour chaque emplacement, l'objet
 * est-il déjà porté, battu par l'équipement actuel (gain simulé ≤ 0 dans la
 * spé de la wishlist), ou encore un gain ?
 *
 * Le personnage est rattaché au royaume vérifié par checkPermission : sans ce
 * contrôle, un personnage sans royaume serait lisible depuis n'importe quelle
 * guilde.
 */
export async function getWishlistStatus(
  characterId: number,
  specializationId: number,
  difficulty: string,
  realmId: number,
): Promise<WishlistStatus> {
  const character = await findCharacterInRealm(characterId, realmId);

  if (!(await wishlistRepo.specBelongsToCharacter(characterId, specializationId))) {
    throw new WishlistSpecializationMismatchError(specializationId);
  }

  const wishes = await wishlistRepo.getCharacterWishlist(characterId, specializationId);
  const itemIds: number[] = wishes
    .map((w: { itemId: number | null }) => w.itemId)
    .filter((id: number | null): id is number => id != null);

  const [snapshots, sims, characterClass] = await Promise.all([
    wishlistRepo.getLatestGearSnapshots(characterId, specializationId),
    wishlistRepo.getCharacterSims(characterId, difficulty, itemIds),
    wishlistRepo.getClassWithSpecializations(character.class),
  ]);

  return buildWishlistStatus({
    specializationId,
    difficulty,
    wishes,
    snapshots,
    sims,
    characterClass,
  });
}
