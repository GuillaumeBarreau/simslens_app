// SIMS-234 : /upgrade/batch et /upgrade/wishlist-batch (optimiseur de loot) ne
// mélangent plus les sims de spés différentes d'un même personnage. La spé
// retenue est la spé principale, sinon la dernière simulée.

const listUpgradesByItemAndDifficulty = vi.fn();
const listWishlistEntriesForItems = vi.fn();
const getSimSpecializationContext = vi.fn();
const isToken = vi.fn();
const getTokenRewards = vi.fn();
const getAllTokens = vi.fn();

vi.mock('../item_upgrade.repository', () => ({
  default: {
    listUpgradesByItemAndDifficulty: (...a: unknown[]) => listUpgradesByItemAndDifficulty(...a),
    listWishlistEntriesForItems: (...a: unknown[]) => listWishlistEntriesForItems(...a),
    getSimSpecializationContext: (...a: unknown[]) => getSimSpecializationContext(...a),
  },
}));
vi.mock('../../item_tokens/item_tokens.repository', () => ({
  default: {
    isToken: (...a: unknown[]) => isToken(...a),
    getTokenRewards: (...a: unknown[]) => getTokenRewards(...a),
    getAllTokens: (...a: unknown[]) => getAllTokens(...a),
  },
}));

import { selectUpgradesBatch, selectWishlistBatch } from '../usecases/selectBatchUpgrades';

const SHAMAN = {
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental', icon: 'ele.jpg', role: 'ranged' },
    { id: 264, name: 'Restoration', icon: 'resto.jpg', role: 'healer' },
  ],
};

function sim(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    characterID: 1,
    itemID: 100,
    reportID: 'r',
    dps: 1100,
    baseDps: 1000,
    spec: 'Elemental Shaman',
    specializationId: 262,
    difficulty: 'heroic',
    timeStamp: new Date('2026-10-01T10:00:00Z'),
    ...overrides,
  };
}

function wish(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    characterId: 1,
    specializationId: 262,
    slot: 'main_hand',
    itemId: 100,
    priority: 1,
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    character: { id: 1, name: 'Thrall', class: 'shaman' },
    item: { id: 100, name: 'Bâton', icon: 'baton', inventoryType: 17 },
    ...overrides,
  };
}

const MAIN_ELEMENTAL = {
  characters: [{ id: 1, specializationId: 262, characterClass: SHAMAN }],
  sims: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  isToken.mockResolvedValue(false);
  getSimSpecializationContext.mockResolvedValue(MAIN_ELEMENTAL);
});

describe('selectUpgradesBatch — une spé par personnage', () => {
  it('deux sims de spés différentes sur le même objet ne se mélangent pas', async () => {
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({ id: 2, spec: 'Restoration Shaman', specializationId: 264, dps: 5000 }),
      sim({ id: 1 }),
    ]);

    const result = await selectUpgradesBatch({ itemIds: [100], difficulty: 'heroic', realmId: 7 });

    expect(result.get(100)).toEqual([
      expect.objectContaining({
        id: 1,
        dps: 1100,
        simSpecialization: expect.objectContaining({ id: 262, name: 'Elemental' }),
      }),
    ]);
    expect(listUpgradesByItemAndDifficulty).toHaveBeenCalledWith(100, 'heroic', 7);
    expect(getSimSpecializationContext).toHaveBeenCalledWith([1, 1], 'heroic');
  });

  it('rattache une ligne non reliée à sa spé par son libellé', async () => {
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({ id: 2, spec: 'Restoration Shaman', specializationId: null }),
      sim({ id: 1, spec: 'elemental', specializationId: null }),
    ]);

    const result = await selectUpgradesBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)?.map((u) => u.id)).toEqual([1]);
  });

  it('sans spé principale, retient la dernière spé simulée', async () => {
    getSimSpecializationContext.mockResolvedValue({
      characters: [{ id: 1, specializationId: null, characterClass: SHAMAN }],
      sims: [
        {
          characterID: 1,
          spec: 'Elemental Shaman',
          specializationId: 262,
          timeStamp: '2026-09-01',
        },
        {
          characterID: 1,
          spec: 'Restoration Shaman',
          specializationId: null,
          timeStamp: '2026-10-01',
        },
      ],
    });
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({ id: 1 }),
      sim({ id: 2, spec: 'Restoration Shaman', specializationId: 264 }),
    ]);

    const result = await selectUpgradesBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)?.map((u) => u.id)).toEqual([2]);
    expect(result.get(100)?.[0].simSpecialization).toMatchObject({ id: 264, name: 'Restoration' });
  });

  it('un jeton regroupe les sims de ses récompenses', async () => {
    isToken.mockResolvedValue(true);
    getTokenRewards.mockResolvedValue([
      { tokenItemId: 900, rewardItemId: 101 },
      { tokenItemId: 900, rewardItemId: 101 },
      { tokenItemId: 900, rewardItemId: 102 },
    ]);
    listUpgradesByItemAndDifficulty.mockImplementation(async (itemId: number) => [
      sim({ id: itemId, itemID: itemId }),
    ]);

    const result = await selectUpgradesBatch({ itemIds: [900], difficulty: 'heroic' });

    expect(listUpgradesByItemAndDifficulty).toHaveBeenCalledTimes(2);
    expect(result.get(900)?.map((u) => u.itemID)).toEqual([101, 102]);
  });

  it("n'interroge pas les spés quand aucune sim n'est trouvée", async () => {
    listUpgradesByItemAndDifficulty.mockResolvedValue([]);

    const result = await selectUpgradesBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)).toEqual([]);
    expect(getSimSpecializationContext).not.toHaveBeenCalled();
  });
});

describe('selectWishlistBatch — une spé par personnage', () => {
  it('deux sims de spés différentes sur le même objet ne se mélangent pas', async () => {
    listWishlistEntriesForItems.mockResolvedValue([
      wish({ id: 2, specializationId: 264, slot: 'off_hand' }),
      wish(),
    ]);
    // La sim Restauration est plus récente et meilleure : elle ne doit pas
    // remplacer celle de la spé principale (Élémentaire).
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({
        id: 2,
        spec: 'Restoration Shaman',
        specializationId: 264,
        dps: 5000,
        timeStamp: new Date('2026-10-09T00:00:00Z'),
      }),
      sim({ id: 1 }),
    ]);

    const result = await selectWishlistBatch({ itemIds: [100], difficulty: 'heroic', realmId: 7 });

    expect(listWishlistEntriesForItems).toHaveBeenCalledWith([100], 7);
    expect(result.get(100)).toEqual([
      expect.objectContaining({
        id: 1,
        dps: 1100,
        isWishlist: 1,
        wishlistSlot: 'main_hand',
        simSpecialization: expect.objectContaining({ id: 262, name: 'Elemental' }),
      }),
    ]);
  });

  it("n'applique pas la sim d'une autre spé à un vœu sans sim", async () => {
    listWishlistEntriesForItems.mockResolvedValue([wish()]);
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({ spec: 'Restoration Shaman', specializationId: 264, dps: 5000 }),
    ]);

    const result = await selectWishlistBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)).toEqual([
      expect.objectContaining({
        characterID: 1,
        itemID: 100,
        dps: null,
        baseDps: null,
        isWishlist: 1,
        wishlistSlot: 'main_hand',
        characters: { id: 1, name: 'Thrall', class: 'shaman' },
      }),
    ]);
  });

  it('relie une sim non rattachée au vœu de sa spé par son libellé', async () => {
    listWishlistEntriesForItems.mockResolvedValue([wish()]);
    listUpgradesByItemAndDifficulty.mockResolvedValue([
      sim({ spec: 'Elemental Shaman', specializationId: null, dps: 1300 }),
    ]);

    const result = await selectWishlistBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)?.[0]).toMatchObject({ dps: 1300, isWishlist: 1 });
  });

  it('sans spé principale ni sim, garde la spé du vœu modifié le plus récemment', async () => {
    getSimSpecializationContext.mockResolvedValue({
      characters: [{ id: 1, specializationId: null, characterClass: SHAMAN }],
      sims: [],
    });
    listWishlistEntriesForItems.mockResolvedValue([
      wish({ id: 1, updatedAt: new Date('2026-09-01T00:00:00Z') }),
      wish({ id: 2, specializationId: 264, slot: 'off_hand', updatedAt: new Date('2026-10-01') }),
    ]);
    listUpgradesByItemAndDifficulty.mockResolvedValue([]);

    const result = await selectWishlistBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)).toEqual([
      expect.objectContaining({
        wishlistSlot: 'off_hand',
        simSpecialization: expect.objectContaining({ id: 264 }),
      }),
    ]);
  });

  it('exclut toujours « je n’en veux pas » (priorité 5)', async () => {
    listWishlistEntriesForItems.mockResolvedValue([wish({ priority: 5 })]);
    listUpgradesByItemAndDifficulty.mockResolvedValue([sim()]);

    const result = await selectWishlistBatch({ itemIds: [100], difficulty: 'heroic' });

    expect(result.get(100)).toEqual([]);
    expect(getSimSpecializationContext).not.toHaveBeenCalled();
  });
});
