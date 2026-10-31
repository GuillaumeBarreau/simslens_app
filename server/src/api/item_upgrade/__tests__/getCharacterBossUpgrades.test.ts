// Upgrades par boss (SIMS-211) : les sims de spés différentes ne se mélangent
// plus ; la spé par défaut est la spé principale du personnage.

const getCharacterBossUpgradesData = vi.fn();

vi.mock('../item_upgrade.repository', () => ({
  default: {
    getCharacterBossUpgradesData: (...a: unknown[]) => getCharacterBossUpgradesData(...a),
  },
}));

import type { SimUpgrade } from '../item_upgrade.bossUpgrades';
import { getCharacterBossUpgrades } from '../usecases/getCharacterBossUpgrades';

const SHAMAN = {
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental', icon: 'ele.jpg', role: 'ranged' },
    { id: 263, name: 'Enhancement', icon: 'enh.jpg', role: 'melee' },
    { id: 264, name: 'Restoration', icon: 'resto.jpg', role: 'healer' },
  ],
};

const ITEM = {
  id: 100,
  name: 'Bâton',
  icon: 'baton',
  quality: 4,
  itemLevel: 650,
  inventoryType: 17,
};

const BOSS = {
  id: 1,
  name: 'Boss',
  icon: null,
  order: 1,
  raidName: 'Raid',
  extension: 'tww',
  season: '3',
  loots: [{ item: ITEM }],
};

function sim(overrides: Partial<SimUpgrade>): SimUpgrade {
  return {
    itemID: 100,
    dps: 1100,
    baseDps: 1000,
    spec: 'Elemental Shaman',
    specializationId: 262,
    reportID: 'r',
    timeStamp: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

function serve({
  upgrades,
  mainSpecializationId = 262,
}: {
  upgrades: SimUpgrade[];
  mainSpecializationId?: number | null;
}) {
  getCharacterBossUpgradesData.mockResolvedValue({
    character: { id: 31, class: 'shaman', specializationId: mainSpecializationId },
    characterClass: SHAMAN,
    bosses: [BOSS],
    upgrades,
    wishlistEntries: [],
    tokenRewards: [],
  });
}

const QUERY = { characterId: 31, difficulty: 'heroic', extension: 'tww', season: '3' };

// Élémentaire : +100 ; Restauration, simulée plus tard : +500.
const TWO_SPECS = [
  sim({ reportID: 'ele', dps: 1100, specializationId: 262, spec: 'Elemental Shaman' }),
  sim({
    reportID: 'resto',
    dps: 1500,
    specializationId: 264,
    spec: 'Restoration Shaman',
    timeStamp: '2026-10-05T10:00:00Z',
  }),
];

describe('getCharacterBossUpgrades — spécialisation des sims', () => {
  it('deux sims de spés différentes sur le même objet ne se mélangent pas (défaut : spé principale)', async () => {
    serve({ upgrades: TWO_SPECS });
    const result = await getCharacterBossUpgrades(QUERY);

    expect(result.specializationId).toBe(262);
    expect(result.specialization).toMatchObject({ id: 262, name: 'Elemental' });
    const [item] = result.bosses[0].items;
    expect(item).toMatchObject({ dpsGain: 100, reportId: 'ele', spec: 'Elemental Shaman' });
  });

  it('renvoie les gains de la spé demandée', async () => {
    serve({ upgrades: TWO_SPECS });
    const result = await getCharacterBossUpgrades({ ...QUERY, specializationId: 264 });

    expect(result.specializationId).toBe(264);
    expect(result.bosses[0].items[0]).toMatchObject({ dpsGain: 500, reportId: 'resto' });
    expect(result.bosses[0].stats.bestGain).toBe(500);
  });

  it('liste les spés simulées, la plus récente en premier', async () => {
    serve({ upgrades: TWO_SPECS });
    const result = await getCharacterBossUpgrades(QUERY);

    expect(result.specializations).toEqual([
      { id: 264, name: 'Restoration', icon: 'resto.jpg', role: 'healer' },
      { id: 262, name: 'Elemental', icon: 'ele.jpg', role: 'ranged' },
    ]);
  });

  it('rattache par son libellé une sim sans specializationId (casse ignorée)', async () => {
    serve({
      upgrades: [
        sim({ reportID: 'legacy', specializationId: null, spec: 'restoration shaman', dps: 1300 }),
        sim({ reportID: 'ele', specializationId: 262, dps: 1100 }),
      ],
    });
    const resto = await getCharacterBossUpgrades({ ...QUERY, specializationId: 264 });
    expect(resto.bosses[0].items[0]).toMatchObject({ dpsGain: 300, reportId: 'legacy' });
    expect(resto.specializations.map((s) => s.id)).toEqual([262, 264]);

    const ele = await getCharacterBossUpgrades(QUERY);
    expect(ele.bosses[0].items[0]).toMatchObject({ dpsGain: 100, reportId: 'ele' });
  });

  it('garde la sim la plus récente par objet dans la spé retenue', async () => {
    serve({
      upgrades: [
        sim({ reportID: 'old', dps: 1900, timeStamp: '2026-09-01T10:00:00Z' }),
        sim({ reportID: 'new', dps: 1050, timeStamp: '2026-10-02T10:00:00Z' }),
      ],
    });
    const result = await getCharacterBossUpgrades(QUERY);
    expect(result.bosses[0].items[0]).toMatchObject({ dpsGain: 50, reportId: 'new' });
  });

  it("garde la spé principale même si elle n'a pas de sim", async () => {
    serve({ upgrades: [TWO_SPECS[1]], mainSpecializationId: 262 });
    const result = await getCharacterBossUpgrades(QUERY);

    expect(result.specializationId).toBe(262);
    expect(result.bosses[0].items[0]).toMatchObject({ hasSimData: false, dpsGain: null });
    expect(result.specializations.map((s) => s.id)).toEqual([264]);
  });

  it('sans spé principale, retient la dernière spé simulée', async () => {
    serve({ upgrades: TWO_SPECS, mainSpecializationId: null });
    const result = await getCharacterBossUpgrades(QUERY);

    expect(result.specializationId).toBe(264);
    expect(result.bosses[0].items[0]).toMatchObject({ dpsGain: 500 });
  });

  // SIMS-202 : grandeur des gains (HPS des sims QE Live).
  it('marque « hps » les gains d’une spé simulée par QE Live', async () => {
    serve({
      upgrades: [TWO_SPECS[0], { ...TWO_SPECS[1], metric: 'hps' }],
    });
    const resto = await getCharacterBossUpgrades({ ...QUERY, specializationId: 264 });
    expect(resto.metric).toBe('hps');
    expect(resto.bosses[0].stats.metric).toBe('hps');
    expect(resto.bosses[0].items[0]).toMatchObject({ dpsGain: 500, metric: 'hps' });

    const ele = await getCharacterBossUpgrades(QUERY);
    expect(ele.metric).toBe('dps');
    expect(ele.bosses[0].items[0]).toMatchObject({ dpsGain: 100, metric: 'dps' });
  });

  it('ne mélange pas une ancienne sim DPS aux HPS de la même spé', async () => {
    serve({
      upgrades: [
        sim({
          itemID: 100,
          reportID: 'old-dps',
          dps: 9000,
          specializationId: 264,
          timeStamp: '2026-09-01T10:00:00Z',
        }),
        sim({
          itemID: 100,
          reportID: 'qe',
          dps: 1020,
          specializationId: 264,
          metric: 'hps',
          timeStamp: '2026-10-05T10:00:00Z',
        }),
      ],
    });
    const result = await getCharacterBossUpgrades({ ...QUERY, specializationId: 264 });
    expect(result.metric).toBe('hps');
    expect(result.bosses[0].items[0]).toMatchObject({ reportId: 'qe', dpsGain: 20 });
  });

  it('sans sim pour la spé retenue, la grandeur est null', async () => {
    serve({ upgrades: [] });
    const result = await getCharacterBossUpgrades(QUERY);
    expect(result.metric).toBeNull();
    expect(result.bosses[0].items[0].metric).toBeNull();
  });

  it('transmet la requête au repository (filtre de wishlist inchangé)', async () => {
    serve({ upgrades: [] });
    await getCharacterBossUpgrades({ ...QUERY, specializationId: 263 });
    expect(getCharacterBossUpgradesData).toHaveBeenCalledWith({ ...QUERY, specializationId: 263 });
  });
});

describe('getCharacterBossUpgrades — priorité des vœux (SIMS-205)', () => {
  function serveWishlist(priority: number | null) {
    getCharacterBossUpgradesData.mockResolvedValue({
      character: { id: 31, class: 'shaman', specializationId: 262 },
      characterClass: SHAMAN,
      bosses: [BOSS],
      upgrades: [],
      wishlistEntries: [{ itemId: 100, priority }],
      tokenRewards: [],
    });
  }

  it.each([0, 1, 4, null])('marque un vœu de priorité %j comme wishlist', async (priority) => {
    serveWishlist(priority);
    const result = await getCharacterBossUpgrades(QUERY);
    expect(result.bosses[0].items[0]).toMatchObject({ isWishlist: true, isBiS: true });
  });

  it('ne marque pas un objet « je n’en veux pas » comme wishlist', async () => {
    serveWishlist(5);
    const result = await getCharacterBossUpgrades(QUERY);
    expect(result.bosses[0].items[0]).toMatchObject({ isWishlist: false, isBiS: false });
    expect(result.bosses[0].stats.highlightedCount).toBe(0);
  });
});
