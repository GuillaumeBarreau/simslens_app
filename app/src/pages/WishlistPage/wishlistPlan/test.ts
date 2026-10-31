import type { CharacterBossUpgrade, CharacterBossUpgradeItem } from 'services/character.service';

import {
  bestSuggestionForSlot,
  buildItemSourceIndex,
  candidateBosses,
  formatDpsGain,
  getNextEmptySlot,
  getSlotLabelKey,
  getSlotSuggestions,
  getWeaponSlots,
  getWishlistProgress,
  getWishlistSlots,
  groupWishesByBoss,
  rankCandidates,
} from '.';

const loot = (
  id: number,
  inventoryType: number | null,
  dpsGain: number | null,
  overrides: Partial<CharacterBossUpgradeItem> = {},
): CharacterBossUpgradeItem => ({
  id,
  name: `Item ${id}`,
  icon: 'icon',
  quality: 4,
  itemLevel: 678,
  inventoryType,
  isToken: false,
  rewardItem: null,
  dps: null,
  baseDps: null,
  dpsGain,
  gainPercent: dpsGain == null ? null : dpsGain / 100,
  hasSimData: dpsGain != null,
  isUpgrade: (dpsGain ?? 0) > 0,
  isBiS: false,
  isWishlist: false,
  reportId: null,
  spec: null,
  timeStamp: null,
  ...overrides,
});

const boss = (
  id: number,
  name: string,
  items: CharacterBossUpgradeItem[],
  order = id,
): CharacterBossUpgrade => ({
  boss: { id, name, icon: null, order, raidName: null, extension: 'Midnight', season: 'season-01' },
  items,
  stats: {
    totalItems: items.length,
    simmedItems: 0,
    upgradesCount: 0,
    highlightedCount: 0,
    bestGain: 0,
    expectedGain: 0,
    upgradeChance: 0,
  },
});

const wish = (itemId: number) => ({ itemId });

describe('weapon slots', () => {
  it('offers every weapon the class allows until one is picked', () => {
    expect(getWeaponSlots('Monk', {})).toEqual(['main_hand', 'off_hand', 'two_hand']);
    expect(getWeaponSlots('Hunter', {})).toEqual(['two_hand']);
    expect(getWeaponSlots('Rogue', {})).toEqual(['main_hand', 'off_hand']);
  });

  it('hides the one-hand slots once a two-hand weapon is wished, and the reverse', () => {
    expect(getWeaponSlots('Monk', { two_hand: wish(1) })).toEqual(['two_hand']);
    expect(getWeaponSlots('Monk', { off_hand: wish(1) })).toEqual(['main_hand', 'off_hand']);
  });

  it('lists armor, then jewelry, then weapons', () => {
    const slots = getWishlistSlots('Hunter', {});
    expect(slots[0]).toBe('head');
    expect(slots.indexOf('neck')).toBeGreaterThan(slots.indexOf('feet'));
    expect(slots[slots.length - 1]).toBe('two_hand');
    expect(slots).toHaveLength(15);
  });
});

describe('getWishlistProgress', () => {
  it('counts 16 slots for a character who can dual wield', () => {
    expect(getWishlistProgress('Monk', {})).toEqual({ filled: 0, total: 16, percent: 0 });
  });

  it('counts a single weapon slot once a two-hand weapon is wished', () => {
    const progress = getWishlistProgress('Monk', { head: wish(1), two_hand: wish(2) });
    expect(progress).toEqual({ filled: 2, total: 15, percent: 13 });
  });

  it('counts 15 slots for a two-hand only class', () => {
    expect(getWishlistProgress('Hunter', { head: wish(1) }).total).toBe(15);
  });

  it('ignores empty entries', () => {
    expect(getWishlistProgress('Rogue', { head: { itemId: null } }).filled).toBe(0);
  });
});

describe('getNextEmptySlot', () => {
  const slots = ['head', 'neck', 'shoulders', 'back'];

  it('returns the next empty slot after the current one', () => {
    expect(getNextEmptySlot(slots, { neck: wish(1) }, 'head')).toBe('shoulders');
  });

  it('wraps around to the start of the list', () => {
    expect(getNextEmptySlot(slots, { back: wish(1) }, 'shoulders')).toBe('head');
  });

  it('starts with the first empty slot without a current slot', () => {
    expect(getNextEmptySlot(slots, { head: wish(1) })).toBe('neck');
  });

  it('never returns the current slot, and null once everything is filled', () => {
    expect(
      getNextEmptySlot(slots, { neck: wish(1), shoulders: wish(2), back: wish(3) }, 'head'),
    ).toBeNull();
    expect(getNextEmptySlot([], {}, null)).toBeNull();
  });
});

describe('getSlotLabelKey', () => {
  it('uses the slot key, or the class override for a dual-wield off hand', () => {
    expect(getSlotLabelKey('finger1', 'Monk')).toBe('slots.finger1');
    expect(getSlotLabelKey('off_hand', 'Rogue')).toBe('slots.main_hand');
    expect(getSlotLabelKey('off_hand', 'Monk')).toBe('slots.off_hand');
  });
});

describe('buildItemSourceIndex', () => {
  it('indexes each item, and a token under its reward, with its boss and gain', () => {
    const token = loot(10, null, 900, {
      isToken: true,
      rewardItem: {
        id: 11,
        name: 'Tier',
        icon: 'tier',
        quality: 4,
        itemLevel: 678,
        inventoryType: 1,
        slot: 'head',
      },
    });
    const index = buildItemSourceIndex([boss(1, 'A', [loot(1, 1, 300), token]), boss(2, 'B', [])]);
    expect(index.get(1)).toMatchObject({ bossName: 'A', dpsGain: 300, hasSimData: true });
    expect(index.get(11)).toMatchObject({ bossName: 'A', dpsGain: 900 });
    expect(index.get(10)?.bossId).toBe(1);
  });

  it('keeps no gain for an item without sim', () => {
    const index = buildItemSourceIndex([boss(1, 'A', [loot(1, 1, null)])]);
    expect(index.get(1)).toMatchObject({ dpsGain: null, hasSimData: false });
  });
});

describe('suggestions', () => {
  const bosses = [
    boss(1, 'A', [loot(1, 1, 300), loot(2, 1, 800), loot(3, 11, 500)]),
    boss(2, 'B', [loot(4, 1, -50), loot(5, 11, 450), loot(6, 13, 700), loot(7, 3, null)]),
  ];

  it('picks the best positive simulated gain of the slot', () => {
    expect(bestSuggestionForSlot(bosses, 'head')).toMatchObject({
      item: { id: 2 },
      bossName: 'A',
      dpsGain: 800,
    });
  });

  it('suggests nothing without a positive simulated gain', () => {
    expect(bestSuggestionForSlot(bosses, 'shoulders')).toBeNull();
    expect(bestSuggestionForSlot([boss(1, 'A', [loot(4, 1, -50)])], 'head')).toBeNull();
  });

  it('follows the query slot, e.g. a weapon in the off hand', () => {
    expect(bestSuggestionForSlot(bosses, 'off_hand')).toBeNull();
    expect(bestSuggestionForSlot(bosses, 'off_hand', { querySlot: 'main_hand' })?.item.id).toBe(6);
  });

  it('skips items already wished, so both rings get a different suggestion', () => {
    const suggestions = getSlotSuggestions(bosses, ['finger1', 'finger2', 'head'], {
      finger1: wish(3),
    });
    expect(suggestions.finger1).toBeUndefined();
    expect(suggestions.finger2?.item.id).toBe(5);
    expect(suggestions.head?.item.id).toBe(2);
  });

  it('suggests a token through its reward item', () => {
    const token = loot(10, null, 1200, {
      isToken: true,
      rewardItem: {
        id: 11,
        name: 'Tier',
        icon: 'tier',
        quality: 4,
        itemLevel: 678,
        inventoryType: 1,
        slot: 'head',
      },
    });
    expect(bestSuggestionForSlot([boss(1, 'A', [token])], 'head')?.item).toMatchObject({
      id: 11,
      name: 'Tier',
    });
  });
});

describe('groupWishesByBoss', () => {
  it('groups wishes by boss in raid order, and lists the rest', () => {
    const bosses = [
      boss(2, 'B', [loot(5, 11, 450)], 2),
      boss(1, 'A', [loot(1, 1, 300), loot(3, 3, 100)], 1),
      boss(3, 'C', [loot(9, 7, 10)], 3),
    ];
    const result = groupWishesByBoss(
      bosses,
      { head: wish(1), shoulders: wish(3), finger1: wish(5), neck: wish(99) },
      ['head', 'neck', 'shoulders', 'finger1'],
    );
    expect(result.groups.map((g) => g.boss.name)).toEqual(['A', 'B']);
    expect(result.groups[0].wishes.map((w) => w.slot)).toEqual(['head', 'shoulders']);
    expect(result.otherSlots).toEqual(['neck']);
    expect(result.bossesWithoutWish).toEqual(['C']);
  });
});

describe('rankCandidates', () => {
  const items = [
    { id: 1, name: 'Casque B', bossName: 'A' },
    { id: 2, name: 'Casque A', bossName: 'B' },
    { id: 3, name: 'Casque C', bossName: 'A' },
    { id: 4, name: 'Casque D', bossName: 'B' },
  ];
  const gains = new Map([
    [1, { dpsGain: 200, gainPercent: 0.2, hasSimData: true }],
    [2, { dpsGain: null, gainPercent: null, hasSimData: false }],
    [3, { dpsGain: 900, gainPercent: 0.9, hasSimData: true }],
    [4, { dpsGain: -20, gainPercent: 0, hasSimData: true }],
  ]);

  it('puts the best gains first, then no gain, then items without sim', () => {
    expect(rankCandidates(items, gains).map((i) => i.id)).toEqual([3, 1, 4, 2]);
  });

  it('sorts by name when nothing is simulated', () => {
    expect(rankCandidates(items, new Map()).map((i) => i.name)).toEqual([
      'Casque A',
      'Casque B',
      'Casque C',
      'Casque D',
    ]);
  });

  it('filters by boss and by name', () => {
    expect(rankCandidates(items, gains, { boss: 'B' }).map((i) => i.id)).toEqual([4, 2]);
    expect(rankCandidates(items, gains, { search: 'casque c' }).map((i) => i.id)).toEqual([3]);
  });

  it('lists the bosses of the candidates once', () => {
    expect(candidateBosses(items)).toEqual(['A', 'B']);
  });
});

describe('formatDpsGain', () => {
  it('formats a gain compactly', () => {
    expect(formatDpsGain(3120)).toBe('+3.1k');
    expect(formatDpsGain(420.4)).toBe('+420');
    expect(formatDpsGain(-5)).toBe('0');
    expect(formatDpsGain(null)).toBe('—');
  });
});
