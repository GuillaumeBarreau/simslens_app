import {
  buildBossUpgrades,
  latestUpgradeByItem,
  pickSpecializationId,
  simMetricForSpecialization,
  simMetricOf,
  simSpecializationIdOf,
  type SimUpgrade,
} from '../item_upgrade.bossUpgrades';

const SHAMAN = {
  name: 'shaman',
  specializations: [
    { id: 262, name: 'Elemental' },
    { id: 264, name: 'Restoration' },
  ],
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

describe('simSpecializationIdOf', () => {
  it('préfère le specializationId de la ligne à son libellé', () => {
    expect(simSpecializationIdOf({ specializationId: 264, spec: 'Elemental' }, SHAMAN)).toBe(264);
  });

  it('se replie sur le libellé (« Spé Classe » ou « spé »)', () => {
    expect(
      simSpecializationIdOf({ specializationId: null, spec: 'ELEMENTAL shaman' }, SHAMAN),
    ).toBe(262);
    expect(simSpecializationIdOf({ specializationId: null, spec: 'restoration' }, SHAMAN)).toBe(
      264,
    );
  });

  it('renvoie null pour un libellé inconnu ou une classe inconnue', () => {
    expect(simSpecializationIdOf({ specializationId: null, spec: 'Fire Mage' }, SHAMAN)).toBeNull();
    expect(simSpecializationIdOf({ specializationId: null, spec: 'Elemental' }, null)).toBeNull();
  });
});

describe('pickSpecializationId', () => {
  const simulated = [{ id: 264, name: 'Restoration' }];

  it('demandée > principale > dernière simulée', () => {
    expect(pickSpecializationId({ requested: 263, mainSpecializationId: 262, simulated })).toBe(
      263,
    );
    expect(pickSpecializationId({ mainSpecializationId: 262, simulated })).toBe(262);
    expect(pickSpecializationId({ mainSpecializationId: null, simulated })).toBe(264);
    expect(pickSpecializationId({ simulated: [] })).toBeNull();
  });
});

describe('latestUpgradeByItem', () => {
  it('à date égale, garde le meilleur DPS de la spé', () => {
    const map = latestUpgradeByItem(
      [
        sim({ reportID: 'a', dps: 1100 }),
        sim({ reportID: 'b', dps: 1200 }),
        sim({ reportID: 'resto', dps: 9000, specializationId: 264 }),
      ],
      262,
      SHAMAN,
    );
    expect(map.get(100)?.reportID).toBe('b');
  });
});

describe('grandeur simulée (SIMS-202)', () => {
  it('simMetricOf : « hps » seulement si la ligne le dit', () => {
    expect(simMetricOf({ metric: 'hps' })).toBe('hps');
    expect(simMetricOf({ metric: 'dps' })).toBe('dps');
    expect(simMetricOf({ metric: null })).toBe('dps');
    expect(simMetricOf({})).toBe('dps');
  });

  it('simMetricForSpecialization : grandeur de la sim la plus récente de la spé', () => {
    const upgrades = [
      sim({ specializationId: 264, timeStamp: '2026-09-01T10:00:00Z' }),
      sim({ specializationId: 264, metric: 'hps', timeStamp: '2026-10-01T10:00:00Z' }),
      sim({ specializationId: 262, timeStamp: '2026-10-09T10:00:00Z' }),
    ];
    expect(simMetricForSpecialization(upgrades, 264, SHAMAN)).toBe('hps');
    expect(simMetricForSpecialization(upgrades, 262, SHAMAN)).toBe('dps');
    expect(simMetricForSpecialization(upgrades, 263, SHAMAN)).toBeNull();
  });

  it('latestUpgradeByItem écarte les sims d’une autre grandeur', () => {
    const map = latestUpgradeByItem(
      [
        sim({ reportID: 'dps', specializationId: 264, timeStamp: '2026-10-09T10:00:00Z' }),
        sim({ reportID: 'hps', specializationId: 264, metric: 'hps' }),
      ],
      264,
      SHAMAN,
      'hps',
    );
    expect(map.get(100)?.reportID).toBe('hps');
  });
});

describe('buildBossUpgrades', () => {
  const token = { id: 50, name: 'Jeton', icon: 'j', quality: 4, itemLevel: 650, inventoryType: 0 };
  const reward = (id: number) => ({
    tokenItemId: 50,
    rewardItemId: id,
    slot: 'head',
    item: { id, name: `Casque ${id}`, icon: 'c', quality: 4, itemLevel: 650, inventoryType: 1 },
  });

  it('résout un jeton vers la récompense au meilleur gain et marque la wishlist', () => {
    const [entry] = buildBossUpgrades({
      bosses: [
        {
          id: 1,
          name: 'Boss',
          icon: null,
          order: 1,
          raidName: null,
          extension: 'tww',
          season: '3',
          loots: [{ item: token }],
        },
      ],
      upgradeByItemId: new Map([
        [201, sim({ itemID: 201, dps: 1050 })],
        [202, sim({ itemID: 202, dps: 1300 })],
      ]),
      wishlistItemIds: new Set([201]),
      tokenRewards: [reward(201), reward(202)],
    });

    expect(entry.items[0]).toMatchObject({
      isToken: true,
      rewardItem: { id: 202 },
      dpsGain: 300,
      isUpgrade: true,
      isWishlist: true,
      isBiS: true,
    });
    expect(entry.stats).toMatchObject({ upgradesCount: 1, simmedItems: 1, bestGain: 300 });
  });
});
