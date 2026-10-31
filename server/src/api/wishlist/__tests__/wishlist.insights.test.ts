// Wishlist enrichie (SIMS-205) : vœu obsolète et alternatives d'un emplacement.

import type { SimUpgrade } from '../../item_upgrade/item_upgrade.bossUpgrades';
import {
  bossByItem,
  buildSlotAlternatives,
  buildWishlistStatus,
  evaluateWish,
  pickGearSnapshot,
  simGain,
} from '../wishlist.insights';

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

const snapshot = (specializationId: number | null, items: Array<[string, number, number]>) => ({
  specializationId,
  timestamp: new Date('2026-10-02T10:00:00Z'),
  items: items.map(([slot, itemId, ilevel]) => ({ slot, itemId, ilevel })),
});

describe('evaluateWish', () => {
  const base = { priority: 0, equippedItemLevel: null, dpsGain: null, hasSim: false };

  it('never flags a « not wanted » item, even if equipped or without gain', () => {
    expect(
      evaluateWish({ ...base, priority: 5, equippedItemLevel: 650, hasSim: true, dpsGain: -3 }),
    ).toEqual({ state: 'not_wanted', obsolete: false });
  });

  it('flags an item already equipped without a simulated gain', () => {
    expect(evaluateWish({ ...base, equippedItemLevel: 650 })).toEqual({
      state: 'equipped',
      obsolete: true,
    });
    expect(evaluateWish({ ...base, equippedItemLevel: 650, hasSim: true, dpsGain: 0 })).toEqual({
      state: 'equipped',
      obsolete: true,
    });
  });

  it('does not flag an equipped item that still has a simulated gain (lower difficulty copy)', () => {
    expect(evaluateWish({ ...base, equippedItemLevel: 636, hasSim: true, dpsGain: 200 })).toEqual({
      state: 'equipped_upgrade',
      obsolete: false,
    });
  });

  it('flags an item beaten by the current gear (gain ≤ 0)', () => {
    expect(evaluateWish({ ...base, hasSim: true, dpsGain: 0 })).toEqual({
      state: 'no_gain',
      obsolete: true,
    });
    expect(evaluateWish({ ...base, hasSim: true, dpsGain: -12 }).state).toBe('no_gain');
  });

  it('keeps an item with a simulated gain', () => {
    expect(evaluateWish({ ...base, priority: 1, hasSim: true, dpsGain: 50 })).toEqual({
      state: 'upgrade',
      obsolete: false,
    });
  });

  it('does not flag an item without a sim of the spec', () => {
    expect(evaluateWish(base)).toEqual({ state: 'not_simulated', obsolete: false });
  });

  it('treats a null priority (legacy rows) as a wish', () => {
    expect(evaluateWish({ ...base, priority: null, equippedItemLevel: 640 }).state).toBe(
      'equipped',
    );
  });
});

describe('pickGearSnapshot', () => {
  it('prefers the snapshot of the wishlist spec', () => {
    const forSpec = snapshot(262, []);
    const latest = snapshot(264, []);
    expect(pickGearSnapshot(forSpec, latest)).toEqual({ snapshot: forSpec, sameSpec: true });
  });

  it('falls back on the latest snapshot of any spec', () => {
    const latest = snapshot(264, []);
    expect(pickGearSnapshot(null, latest)).toEqual({ snapshot: latest, sameSpec: false });
  });

  it('returns null without any snapshot', () => {
    expect(pickGearSnapshot(null, null)).toBeNull();
  });
});

describe('simGain', () => {
  it('computes the gain and its percentage', () => {
    expect(simGain({ dps: 1100, baseDps: 1000 })).toEqual({ dpsGain: 100, gainPercent: 10 });
  });

  it('returns nulls without a sim', () => {
    expect(simGain(undefined)).toEqual({ dpsGain: null, gainPercent: null });
  });
});

describe('buildWishlistStatus', () => {
  const wishes = [
    { slot: 'head', itemId: 100, priority: 1 },
    { slot: 'neck', itemId: 200, priority: 0 },
    { slot: 'feet', itemId: 300, priority: 2 },
    { slot: 'legs', itemId: 400, priority: 5 },
    { slot: 'back', itemId: null, priority: 0 },
  ];

  it('flags equipped and beaten wishes with the sims of the wishlist spec only', () => {
    const result = buildWishlistStatus({
      specializationId: 262,
      difficulty: 'heroic',
      wishes,
      snapshots: { forSpec: snapshot(262, [['neck', 200, 655]]), latest: null },
      sims: [
        sim({ itemID: 100, dps: 1050 }),
        // Restauration : gain, mais la wishlist est celle d'Élémentaire.
        sim({ itemID: 300, dps: 1400, specializationId: 264, spec: 'Restoration Shaman' }),
        sim({ itemID: 300, dps: 990 }),
      ],
      characterClass: SHAMAN,
    });

    expect(result.snapshot).toEqual({
      specializationId: 262,
      timestamp: '2026-10-02T10:00:00.000Z',
      sameSpec: true,
    });
    expect(result.slots.head).toMatchObject({ state: 'upgrade', obsolete: false, dpsGain: 50 });
    expect(result.slots.neck).toMatchObject({
      state: 'equipped',
      obsolete: true,
      equippedItemLevel: 655,
    });
    expect(result.slots.feet).toMatchObject({ state: 'no_gain', obsolete: true, dpsGain: -10 });
    expect(result.slots.legs).toMatchObject({ state: 'not_wanted', obsolete: false, priority: 5 });
    expect(result.slots.back).toBeUndefined();
  });

  it('marks wishes as not simulated when the spec has no sim', () => {
    const result = buildWishlistStatus({
      specializationId: 264,
      difficulty: 'heroic',
      wishes: [{ slot: 'head', itemId: 100, priority: 0 }],
      snapshots: { forSpec: null, latest: null },
      sims: [sim({ itemID: 100 })],
      characterClass: SHAMAN,
    });
    expect(result.snapshot).toBeNull();
    expect(result.slots.head).toMatchObject({ state: 'not_simulated', dpsGain: null });
  });

  it('reports a snapshot of another spec', () => {
    const result = buildWishlistStatus({
      specializationId: 262,
      difficulty: 'heroic',
      wishes: [{ slot: 'finger1', itemId: 500, priority: 0 }],
      snapshots: { forSpec: null, latest: snapshot(264, [['finger2', 500, 640]]) },
      sims: [],
      characterClass: SHAMAN,
    });
    expect(result.snapshot?.sameSpec).toBe(false);
    expect(result.slots.finger1).toMatchObject({ state: 'equipped', equippedItemLevel: 640 });
  });
});

describe('bossByItem', () => {
  const bossA = { id: 1, name: 'Boss A', order: 1 };
  const bossB = { id: 2, name: 'Boss B', order: 2 };

  it('links an item to the boss that drops it, first in raid order', () => {
    const map = bossByItem({
      drops: [
        { itemId: 100, boss: bossB },
        { itemId: 100, boss: bossA },
      ],
      tokenLinks: [],
    });
    expect(map.get(100)).toEqual(bossA);
  });

  it('links a tier piece to the boss of its token', () => {
    const map = bossByItem({
      drops: [{ itemId: 900, boss: bossB }],
      tokenLinks: [{ tokenItemId: 900, rewardItemId: 300 }],
    });
    expect(map.get(300)).toEqual(bossB);
  });
});

describe('buildSlotAlternatives', () => {
  const item = (id: number, name: string) => ({
    id,
    name,
    icon: `icon${id}`,
    quality: 4,
    itemLevel: 650,
  });
  const bosses = new Map([
    [100, { id: 1, name: 'Boss A', order: 1 }],
    [200, { id: 2, name: 'Boss B', order: 2 }],
    [300, { id: 3, name: 'Boss C', order: 3 }],
  ]);

  it('lists the raid items of the slot by simulated gain of the spec, unsimulated last', () => {
    const result = buildSlotAlternatives({
      slot: 'head',
      specializationId: 262,
      difficulty: 'heroic',
      candidates: [
        item(300, 'Casque C'),
        item(100, 'Casque A'),
        item(200, 'Casque B'),
        item(400, 'Casque crafté'),
      ],
      wishItemId: 100,
      sims: [
        sim({ itemID: 100, dps: 1050 }),
        sim({ itemID: 200, dps: 1200 }),
        sim({ itemID: 300, dps: 1900, specializationId: 264, spec: 'Restoration Shaman' }),
      ],
      characterClass: SHAMAN,
      bosses,
    });

    expect(result.alternatives.map((a) => [a.itemId, a.dpsGain, a.isWish])).toEqual([
      [200, 200, false],
      [100, 50, true],
      [300, null, false],
    ]);
    expect(result.alternatives[0]).toMatchObject({
      boss: { id: 2, name: 'Boss B' },
      gainPercent: 20,
      hasSimData: true,
    });
    expect(result.alternatives[2].hasSimData).toBe(false);
    expect(result.wishItemId).toBe(100);
  });

  it('lists each item once', () => {
    const result = buildSlotAlternatives({
      slot: 'head',
      specializationId: 262,
      difficulty: 'heroic',
      candidates: [item(100, 'Casque A'), item(100, 'Casque A')],
      wishItemId: null,
      sims: [],
      characterClass: SHAMAN,
      bosses,
    });
    expect(result.alternatives).toHaveLength(1);
  });
});
