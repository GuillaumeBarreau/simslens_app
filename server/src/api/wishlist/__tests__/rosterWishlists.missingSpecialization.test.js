import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Vue roster des wishlists (SIMS-209) : un personnage sans spécialisation
 * n'est plus écarté en silence. Sa wishlist affichée est celle de la spé où
 * il a rempli le plus d'emplacements, et elle compte dans la complétion.
 */
const { prisma } = require('../../../data');
const repo = require('../wishlist.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const row = (characterId, specializationId, slot, primarySpecId) => ({
  id: characterId * 100 + specializationId + slot.length,
  characterId,
  specializationId,
  slot,
  itemId: 1000 + slot.length,
  character: { id: characterId, name: `char${characterId}`, specializationId: primarySpecId },
  item: { name: slot, icon: null, itemLevel: 600, quality: 4 },
});

describe('displayedSpecByCharacter', () => {
  it('keeps the primary spec of a character that has one', () => {
    const displayed = repo.displayedSpecByCharacter([
      { characterId: 1, specializationId: 62, primarySpecId: 63 },
    ]);
    expect(displayed.get(1)).toBe(63);
  });

  it('picks the most filled spec of a character without one', () => {
    const displayed = repo.displayedSpecByCharacter([
      { characterId: 2, specializationId: 62, primarySpecId: null },
      { characterId: 2, specializationId: 64, primarySpecId: null },
      { characterId: 2, specializationId: 64, primarySpecId: null },
    ]);
    expect(displayed.get(2)).toBe(64);
  });

  it('breaks ties with the smallest spec id', () => {
    const displayed = repo.displayedSpecByCharacter([
      { characterId: 3, specializationId: 70, primarySpecId: null },
      { characterId: 3, specializationId: 65, primarySpecId: null },
    ]);
    expect(displayed.get(3)).toBe(65);
  });
});

describe('getRosterWishlists', () => {
  it('no longer filters out characters without specialization', async () => {
    const findMany = vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([]);
    await repo.getRosterWishlists('3');
    expect(findMany.mock.calls[0][0].where).toEqual({
      itemId: { not: null },
      character: { realmId: 3 },
    });
  });

  it('returns the wishlist of a character without specialization', async () => {
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(1, 62, 'head', 62),
      row(1, 63, 'neck', 62),
      row(2, 64, 'head', null),
      row(2, 64, 'neck', null),
      row(2, 65, 'feet', null),
    ]);
    const result = await repo.getRosterWishlists(3);
    expect(result.map((w) => [w.characterId, w.specializationId, w.slot])).toEqual([
      [1, 62, 'head'],
      [2, 64, 'head'],
      [2, 64, 'neck'],
    ]);
    expect(result[1].character.specializationId).toBeNull();
  });
});

describe('getRosterWishlistCompletion', () => {
  it('counts the wishlist of a character without specialization', async () => {
    const findCharacters = vi.spyOn(prisma.characters, 'findMany').mockResolvedValue([
      { id: 1, specializationId: 62 },
      { id: 2, specializationId: null },
    ]);
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      { characterId: 1, specializationId: 62, slot: 'head' },
      { characterId: 1, specializationId: 63, slot: 'neck' },
      { characterId: 2, specializationId: 64, slot: 'head' },
      { characterId: 2, specializationId: 64, slot: 'main_hand' },
      { characterId: 2, specializationId: 64, slot: 'off_hand' },
      { characterId: 2, specializationId: 65, slot: 'feet' },
    ]);

    await expect(repo.getRosterWishlistCompletion(3)).resolves.toEqual({ 1: 1, 2: 2 });
    expect(findCharacters.mock.calls[0][0].where).toEqual({ realmId: 3, archived: 0 });
  });
});
