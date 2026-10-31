// Wishlist enrichie (SIMS-205) : état des vœux et alternatives d'un emplacement,
// rattachés au royaume vérifié par checkPermission.

const { findCharacterById, repo } = vi.hoisted(() => ({
  findCharacterById: vi.fn(),
  repo: {
    specBelongsToCharacter: vi.fn(),
    getCharacterSpecs: vi.fn(),
    getCharacterWishlist: vi.fn(),
    getLatestGearSnapshots: vi.fn(),
    getCharacterSims: vi.fn(),
    getClassWithSpecializations: vi.fn(),
    getAvailableItemsForSlot: vi.fn(),
    getRaidDropsOfItems: vi.fn(),
  },
}));

vi.mock('../../character/character.repository', () => ({
  default: { findCharacterById },
}));
vi.mock('../wishlist.repository', () => ({ default: repo }));

import { getWishlistSlotAlternatives } from '../usecases/getWishlistSlotAlternatives';
import { getWishlistStatus } from '../usecases/getWishlistStatus';

const SHAMAN = {
  name: 'shaman',
  specializations: [{ id: 262, name: 'Elemental' }],
};

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue({ id: 31, realmId: 3, class: 'Shaman' });
  repo.specBelongsToCharacter.mockReset().mockResolvedValue(true);
  repo.getCharacterSpecs.mockReset().mockResolvedValue([
    { id: 262, name: 'Elemental' },
    { id: 264, name: 'Restoration' },
  ]);
  repo.getCharacterWishlist.mockReset().mockResolvedValue([
    { slot: 'head', itemId: 100, priority: 1 },
    { slot: 'neck', itemId: 200, priority: 0 },
  ]);
  repo.getLatestGearSnapshots.mockReset().mockResolvedValue({
    forSpec: {
      specializationId: 262,
      timestamp: '2026-10-02T10:00:00Z',
      items: [{ slot: 'neck', itemId: 200, ilevel: 650 }],
    },
    latest: null,
  });
  repo.getCharacterSims.mockReset().mockResolvedValue([
    {
      itemID: 100,
      dps: 1100,
      baseDps: 1000,
      spec: 'Elemental Shaman',
      specializationId: 262,
      reportID: 'r',
      timeStamp: '2026-10-01T10:00:00Z',
    },
  ]);
  repo.getClassWithSpecializations.mockReset().mockResolvedValue(SHAMAN);
  repo.getAvailableItemsForSlot.mockReset().mockResolvedValue([
    { id: 100, name: 'Casque A', icon: 'a', quality: 4, itemLevel: 650 },
    { id: 101, name: 'Casque B', icon: 'b', quality: 4, itemLevel: 650 },
  ]);
  repo.getRaidDropsOfItems.mockReset().mockResolvedValue({
    drops: [
      { itemId: 100, boss: { id: 1, name: 'Boss A', order: 1 } },
      { itemId: 101, boss: { id: 2, name: 'Boss B', order: 2 } },
    ],
    tokenLinks: [],
  });
});

describe('getWishlistStatus', () => {
  it('returns the state of each wish for the spec and difficulty', async () => {
    const result = await getWishlistStatus(31, 262, 'heroic', 3);

    expect(result.slots.head).toMatchObject({ state: 'upgrade', dpsGain: 100 });
    expect(result.slots.neck).toMatchObject({ state: 'equipped', obsolete: true });
    expect(repo.getCharacterSims).toHaveBeenCalledWith(31, 'heroic', [100, 200]);
    expect(repo.getLatestGearSnapshots).toHaveBeenCalledWith(31, 262);
    expect(repo.getClassWithSpecializations).toHaveBeenCalledWith('Shaman');
  });

  it('refuses a character of another realm without reading its wishlist', async () => {
    findCharacterById.mockResolvedValue({ id: 31, realmId: 9, class: 'Shaman' });
    await expect(getWishlistStatus(31, 262, 'heroic', 3)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repo.getCharacterWishlist).not.toHaveBeenCalled();
  });

  it('refuses a character without realm', async () => {
    findCharacterById.mockResolvedValue({ id: 31, realmId: null, class: 'Shaman' });
    await expect(getWishlistStatus(31, 262, 'heroic', 3)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('refuses a spec of another class', async () => {
    repo.specBelongsToCharacter.mockResolvedValue(false);
    await expect(getWishlistStatus(31, 71, 'heroic', 3)).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_specialization',
    });
    expect(repo.getCharacterWishlist).not.toHaveBeenCalled();
  });
});

describe('getWishlistSlotAlternatives', () => {
  const QUERY = { specializationId: 262, difficulty: 'heroic', extension: 'tww', season: '3' };

  it('lists the raid items of the slot with the gain of the wishlist spec', async () => {
    const result = await getWishlistSlotAlternatives(31, 'head', QUERY, 3);

    // Shaman = classe WoW 7 ; la spé filtre les armes.
    expect(repo.getAvailableItemsForSlot).toHaveBeenCalledWith('head', 'tww', '3', 7, 'Elemental');
    expect(repo.getCharacterSims).toHaveBeenCalledWith(31, 'heroic', [100, 101]);
    expect(repo.getRaidDropsOfItems).toHaveBeenCalledWith([100, 101], 'tww', '3');
    expect(result.wishItemId).toBe(100);
    expect(result.alternatives.map((a) => [a.itemId, a.dpsGain, a.isWish, a.boss?.name])).toEqual([
      [100, 100, true, 'Boss A'],
      [101, null, false, 'Boss B'],
    ]);
  });

  it('refuses an unknown slot before any read', async () => {
    await expect(getWishlistSlotAlternatives(31, 'tabard', QUERY, 3)).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_slot',
    });
    expect(findCharacterById).not.toHaveBeenCalled();
  });

  it('refuses a character of another realm', async () => {
    findCharacterById.mockResolvedValue({ id: 31, realmId: 9, class: 'Shaman' });
    await expect(getWishlistSlotAlternatives(31, 'head', QUERY, 3)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repo.getAvailableItemsForSlot).not.toHaveBeenCalled();
  });

  it('refuses a spec of another class', async () => {
    await expect(
      getWishlistSlotAlternatives(31, 'head', { ...QUERY, specializationId: 71 }, 3),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_specialization' });
    expect(repo.getAvailableItemsForSlot).not.toHaveBeenCalled();
  });
});
