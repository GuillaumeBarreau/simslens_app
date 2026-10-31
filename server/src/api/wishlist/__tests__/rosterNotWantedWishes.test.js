import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Priorité des vœux (SIMS-205) : un objet marqué « je n'en veux pas »
 * (priorité 5) reste sur la fiche du joueur mais ne compte jamais comme un
 * vœu dans la vue roster, sa complétion ni le signalement des autres spés.
 */
const { prisma } = require('../../../data');
const repo = require('../wishlist.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

const NOT_WANTED = 5;

const row = (characterId, specializationId, slot, priority, primarySpecId = 62) => ({
  id: characterId * 100 + specializationId + slot.length,
  characterId,
  specializationId,
  slot,
  itemId: 1000 + slot.length,
  priority,
  character: {
    id: characterId,
    name: `char${characterId}`,
    specializationId: primarySpecId,
    offspecs: [],
  },
  specialization: { id: specializationId, name: `spec${specializationId}` },
  item: { name: slot, icon: null, itemLevel: 600, quality: 4 },
});

describe('getRosterWishlists', () => {
  it('leaves out « not wanted » items and keeps every other priority', async () => {
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(1, 62, 'head', 0),
      row(1, 62, 'neck', 1),
      row(1, 62, 'feet', NOT_WANTED),
      row(1, 62, 'legs', null),
    ]);
    const result = await repo.getRosterWishlists(3);
    expect(result.map((w) => w.slot)).toEqual(['head', 'neck', 'legs']);
  });

  it('does not pick the displayed spec of a character without one from « not wanted » rows', async () => {
    vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      row(2, 64, 'head', 0, null),
      row(2, 65, 'head', NOT_WANTED, null),
      row(2, 65, 'neck', NOT_WANTED, null),
    ]);
    const result = await repo.getRosterWishlists(3);
    expect(result.map((w) => [w.specializationId, w.slot])).toEqual([[64, 'head']]);
  });
});

describe('getRosterWishlistCompletion', () => {
  it('does not count a « not wanted » slot as filled', async () => {
    vi.spyOn(prisma.characters, 'findMany').mockResolvedValue([{ id: 1, specializationId: 62 }]);
    const findMany = vi.spyOn(prisma.character_wishlists, 'findMany').mockResolvedValue([
      { characterId: 1, specializationId: 62, slot: 'head', priority: 2 },
      { characterId: 1, specializationId: 62, slot: 'neck', priority: NOT_WANTED },
      { characterId: 1, specializationId: 62, slot: 'feet', priority: null },
    ]);

    await expect(repo.getRosterWishlistCompletion(3)).resolves.toEqual({ 1: 2 });
    expect(findMany.mock.calls[0][0].select).toMatchObject({ priority: true });
  });
});

describe('getRosterHiddenSpecWishlists', () => {
  it('does not report an off-spec filled only with « not wanted » items', async () => {
    const findMany = vi
      .spyOn(prisma.character_wishlists, 'findMany')
      .mockResolvedValue([
        row(1, 62, 'head', 0),
        row(1, 63, 'head', NOT_WANTED),
        row(1, 64, 'head', 3),
      ]);
    const result = await repo.getRosterHiddenSpecWishlists(3);

    expect(result).toHaveLength(1);
    expect(result[0].hiddenSpecializations.map((s) => s.id)).toEqual([64]);
    expect(findMany.mock.calls[0][0].select).toMatchObject({ priority: true });
  });
});
