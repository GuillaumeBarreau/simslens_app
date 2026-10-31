import { ID_TO_CLASS, VALID_SLOTS } from '../../../shared/constants/wow';
import { normalizeClass } from '../../../shared/utils/normalizeClass';
import { findCharacterInRealm } from '../../character/character.access';
import { InvalidWishlistSlotError, WishlistSpecializationMismatchError } from '../wishlist.errors';
import type { SlotAlternatives, SlotCandidate } from '../wishlist.insights';
import { bossByItem, buildSlotAlternatives } from '../wishlist.insights';
import wishlistRepo from '../wishlist.repository';
import type { WishlistSlotAlternativesQuery } from '../wishlist.types';

/** Identifiant de classe WoW (celui des filtres d'objets) d'après son nom. */
function wowClassIdOf(className: string | null | undefined): number | null {
  const normalized = normalizeClass(className);
  const entry = Object.entries(ID_TO_CLASS as Record<string, string>).find(
    ([, name]) => name === normalized,
  );
  return entry ? Number(entry[0]) : null;
}

/**
 * Alternatives d'un emplacement de la wishlist (SIMS-205) : les objets de raid
 * de la saison sélectionnables sur cet emplacement (même liste que le choix
 * d'un vœu), avec leur gain simulé dans la spé de la wishlist et leur boss.
 * Périmètre : objets de raid uniquement (pas de donjons M+).
 *
 * Le personnage est rattaché au royaume vérifié par checkPermission.
 */
export async function getWishlistSlotAlternatives(
  characterId: number,
  slot: string,
  { specializationId, difficulty, extension, season }: WishlistSlotAlternativesQuery,
  realmId: number,
): Promise<SlotAlternatives> {
  if (!VALID_SLOTS.includes(slot)) {
    throw new InvalidWishlistSlotError(slot);
  }

  const character = await findCharacterInRealm(characterId, realmId);

  const specs: Array<{ id: number; name: string }> | null =
    await wishlistRepo.getCharacterSpecs(characterId);
  const spec = specs?.find((s) => s.id === specializationId);
  if (!spec) {
    throw new WishlistSpecializationMismatchError(specializationId);
  }

  const [candidates, wishes]: [SlotCandidate[], Array<{ slot: string; itemId: number | null }>] =
    await Promise.all([
      wishlistRepo.getAvailableItemsForSlot(
        slot,
        extension,
        season,
        wowClassIdOf(character.class),
        spec.name,
      ),
      wishlistRepo.getCharacterWishlist(characterId, specializationId),
    ]);
  const wishItemId = wishes.find((w) => w.slot === slot)?.itemId ?? null;

  const itemIds = [...new Set(candidates.map((c) => c.id))];
  const [sims, characterClass, drops] = await Promise.all([
    wishlistRepo.getCharacterSims(characterId, difficulty, itemIds),
    wishlistRepo.getClassWithSpecializations(character.class),
    wishlistRepo.getRaidDropsOfItems(itemIds, extension, season),
  ]);

  return buildSlotAlternatives({
    slot,
    specializationId,
    difficulty,
    candidates,
    wishItemId,
    sims,
    characterClass,
    bosses: bossByItem(drops),
  });
}
