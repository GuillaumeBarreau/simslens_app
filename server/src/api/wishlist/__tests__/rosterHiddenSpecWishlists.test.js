import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Vue roster des wishlists (SIMS-212) : les wishlists des autres spés que celle
 * affichée sont signalées, au lieu d'être masquées en silence.
 */
const { prisma } = require('../../../data');
const repo = require('../wishlist.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const SPEC_NAMES = { 62: 'Arcane', 63: 'Fire', 64: 'Frost' };

const row = (characterId, specializationId, primarySpecId, offspecs = []) => ({
  specializationId,
  character: {
    id: characterId,
    name: `char${characterId}`,
    class: 'mage',
    specializationId: primarySpecId,
    offspecs: offspecs.map((id) => ({ specializationId: id })),
  },
  specialization: { id: specializationId, name: SPEC_NAMES[specializationId] },
});

describe('getRosterHiddenSpecWishlists', () => {
  it('reads the wishlists of the realm only', async () => {
    const findMany = vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([]);
    await expect(repo.getRosterHiddenSpecWishlists('3')).resolves.toEqual([]);
    expect(findMany.mock.calls[0][0].where).toEqual({
      itemId: { not: null },
      character: { realmId: 3 },
    });
  });

  it('counts the items of the specs not shown, and flags the declared off-specs', async () => {
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(1, 62, 62, [64]),
      row(1, 64, 62, [64]),
      row(1, 64, 62, [64]),
      row(1, 63, 62, [64]),
      row(2, 62, 62),
    ]);
    await expect(repo.getRosterHiddenSpecWishlists(3)).resolves.toEqual([
      {
        character: { id: 1, name: 'char1', class: 'mage', specializationId: 62 },
        displayedSpecializationId: 62,
        hiddenSpecializations: [
          { id: 63, name: 'Fire', itemCount: 1, isDeclaredOffSpec: false },
          { id: 64, name: 'Frost', itemCount: 2, isDeclaredOffSpec: true },
        ],
      },
    ]);
  });

  it('reports a character whose wishlist is only filled outside his primary spec', async () => {
    // getRosterWishlists n'a aucune ligne pour lui : il disparaissait de la vue.
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(1, 64, 62, [64]),
      row(1, 64, 62, [64]),
    ]);
    const [entry] = await repo.getRosterHiddenSpecWishlists(3);
    expect(entry.displayedSpecializationId).toBe(62);
    expect(entry.hiddenSpecializations).toEqual([
      { id: 64, name: 'Frost', itemCount: 2, isDeclaredOffSpec: true },
    ]);
  });

  it('reports the other specs of a character without primary spec', async () => {
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(2, 64, null),
      row(2, 64, null),
      row(2, 63, null),
    ]);
    const [entry] = await repo.getRosterHiddenSpecWishlists(3);
    expect(entry.displayedSpecializationId).toBe(64);
    expect(entry.hiddenSpecializations).toEqual([
      { id: 63, name: 'Fire', itemCount: 1, isDeclaredOffSpec: false },
    ]);
  });
});
