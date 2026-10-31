import type { CharacterBossUpgrade, CharacterBossUpgradeItem } from 'services/character.service';
import type { RaidEvent, RaidSignup } from 'services/event.service';
import type { Character, EnchantVerifyResult, WishlistRecord } from 'types/character.types';
import type { LinkedCharacter } from 'types/user.types';

import {
  anomaliesBySlot,
  bestBossId,
  characterRenderUrl,
  computeGearTodo,
  computeRaidTodo,
  computeSimTodo,
  computeWishlistTodo,
  countTodoActions,
  countWishlistFilled,
  daysUntil,
  effectiveSignupStatus,
  listGearAnomalies,
  resolveActivityCharacter,
  slotSeverity,
  sortBossLoot,
  topUpgrades,
} from '.';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 10, 12);

const signup = (characterId: number, status: RaidSignup['status']) =>
  ({ characterId, status }) as RaidSignup;
const event = (signups: RaidSignup[] = [], defaultPresent = false) =>
  ({ signups, defaultPresent }) as Pick<RaidEvent, 'signups' | 'defaultPresent'>;

describe('resolveActivityCharacter', () => {
  const realmChar = { id: 1, name: 'Realm', reportsByDifficulty: null } as unknown as Character;
  const linked = [{ id: 2, name: 'Linked', class: 'monk', realm: 'hyjal' }] as LinkedCharacter[];

  it('prefers the realm list, which carries the reports', () => {
    expect(resolveActivityCharacter([realmChar], linked, 1)?.name).toBe('Realm');
  });

  it('falls back to the Battle.net account when the character is in another realm', () => {
    expect(resolveActivityCharacter([realmChar], linked, 2)?.name).toBe('Linked');
  });

  it('returns nothing without a selected or known character', () => {
    expect(resolveActivityCharacter([realmChar], linked, null)).toBeUndefined();
    expect(resolveActivityCharacter([realmChar], linked, 3)).toBeUndefined();
  });
});

describe('characterRenderUrl', () => {
  it('builds Blizzard render URLs from a relative thumbnail', () => {
    expect(characterRenderUrl('hyjal/96/1-avatar.jpg', 'EU')).toBe(
      'https://render.worldofwarcraft.com/eu/character/hyjal/96/1-avatar.jpg',
    );
    expect(characterRenderUrl('hyjal/96/1-avatar.jpg', 'us', 'main-raw')).toBe(
      'https://render.worldofwarcraft.com/us/character/hyjal/96/1-main-raw.png',
    );
    expect(characterRenderUrl('hyjal/96/1-avatar.jpg', null, 'inset')).toBe(
      'https://render.worldofwarcraft.com/eu/character/hyjal/96/1-inset.jpg',
    );
  });

  it('keeps a full URL and handles a missing thumbnail', () => {
    expect(characterRenderUrl('https://cdn.example/x.jpg', 'eu')).toBe('https://cdn.example/x.jpg');
    expect(characterRenderUrl(null, 'eu')).toBeNull();
  });
});

describe('effectiveSignupStatus', () => {
  it('reads the signup of the character', () => {
    expect(effectiveSignupStatus(event([signup(7, 'ABSENT')]), 7)).toBe('ABSENT');
  });

  it('counts a default-present raid without signup as present', () => {
    expect(effectiveSignupStatus(event([], true), 7)).toBe('PRESENT');
    expect(effectiveSignupStatus(event([signup(8, 'PRESENT')]), 7)).toBeNull();
  });

  it('has no status without a character', () => {
    expect(effectiveSignupStatus(event([signup(7, 'PRESENT')]), null)).toBeNull();
  });
});

describe('computeRaidTodo', () => {
  it('counts raids without answer or with a tentative answer', () => {
    const events = [
      event([signup(7, 'PRESENT')]),
      event([signup(7, 'TENTATIVE')]),
      event([]),
      event([], true),
      event([signup(7, 'ABSENT')]),
    ];
    expect(computeRaidTodo(events, 7)).toEqual({ status: 'warning', pending: 2, total: 5 });
  });

  it('is ok when every raid has a firm answer, neutral without raids', () => {
    expect(computeRaidTodo([event([signup(7, 'LATE')])], 7)).toEqual({
      status: 'ok',
      pending: 0,
      total: 1,
    });
    expect(computeRaidTodo([], 7)).toEqual({ status: 'neutral', pending: 0, total: 0 });
  });
});

describe('daysUntil', () => {
  it('counts calendar days', () => {
    const now = new Date(2026, 9, 10, 23, 0);
    expect(daysUntil(new Date(2026, 9, 10, 23, 30), now)).toBe(0);
    expect(daysUntil(new Date(2026, 9, 11, 0, 30), now)).toBe(1);
    expect(daysUntil(new Date(2026, 9, 14, 20, 0), now)).toBe(4);
  });
});

describe('computeSimTodo', () => {
  const report = (ageDays: number, hasNoUpgrade = false) => ({
    id: 'r',
    timestamp: NOW - ageDays * DAY,
    hasNoUpgrade,
  });

  it('uses the most recent report of all difficulties', () => {
    const sim = computeSimTodo(
      { reportsByDifficulty: { normal: report(10), heroic: report(1), mythic: null } },
      NOW,
      7,
    );
    expect(sim).toEqual({ status: 'ok', freshness: 'fresh', ageDays: 1, timestamp: NOW - DAY });
  });

  it('follows the guild stale threshold', () => {
    const source = { reportsByDifficulty: { normal: null, heroic: null, mythic: report(5) } };
    expect(computeSimTodo(source, NOW, 7)).toMatchObject({ status: 'warning', freshness: 'late' });
    expect(computeSimTodo(source, NOW, 4)).toMatchObject({ status: 'alert', freshness: 'stale' });
  });

  it('keeps a no-upgrade report fresh', () => {
    const source = {
      reportsByDifficulty: { normal: null, heroic: null, mythic: report(30, true) },
    };
    expect(computeSimTodo(source, NOW, 7)).toMatchObject({ status: 'ok', ageDays: 30 });
  });

  it('falls back to the most recent report timestamp', () => {
    expect(
      computeSimTodo({ reportsByDifficulty: null, recentReportTimestamp: NOW - 9 * DAY }, NOW, 7),
    ).toMatchObject({ status: 'alert', freshness: 'stale', ageDays: 9 });
  });

  it('flags a missing sim, and stays neutral when the data is not provided', () => {
    expect(computeSimTodo({ reportsByDifficulty: null }, NOW)).toMatchObject({
      status: 'alert',
      freshness: 'missing',
    });
    expect(computeSimTodo({} as Character, NOW).freshness).toBe('unknown');
    expect(computeSimTodo(undefined, NOW).status).toBe('neutral');
  });
});

describe('gear anomalies', () => {
  const verify: EnchantVerifyResult = {
    results: [
      { slot: 'head', isValid: false, reason: 'missing' },
      { slot: 'chest', isValid: false, reason: 'invalid', displayName: 'Old enchant' },
      { slot: 'legs', isValid: true, reason: 'valid', craftingQuality: 1, displayName: 'Rank 1' },
      { slot: 'feet', isValid: true, reason: 'valid', craftingQuality: 2 },
      { slot: 'back', isValid: null, reason: 'not_configured' },
    ],
    gems: [
      { slot: 'neck', isValid: false, reason: 'missing', rank: null },
      { slot: 'head', isValid: true, reason: 'valid', rank: 1 },
      { slot: 'wrists', isValid: null, reason: 'not_required', rank: null },
    ],
  };

  it('lists missing, invalid and rank-1 items', () => {
    expect(listGearAnomalies(verify)).toEqual([
      { slot: 'head', kind: 'enchant', issue: 'missing', displayName: undefined },
      { slot: 'chest', kind: 'enchant', issue: 'invalid', displayName: 'Old enchant' },
      { slot: 'legs', kind: 'enchant', issue: 'rank1', displayName: 'Rank 1' },
      { slot: 'neck', kind: 'gem', issue: 'missing' },
      { slot: 'head', kind: 'gem', issue: 'rank1' },
    ]);
  });

  it('groups them by slot with a severity', () => {
    const bySlot = anomaliesBySlot(listGearAnomalies(verify));
    expect(bySlot.head).toHaveLength(2);
    expect(slotSeverity(bySlot.head)).toBe('alert');
    expect(slotSeverity(bySlot.legs)).toBe('warning');
    expect(slotSeverity(bySlot.feet)).toBe('ok');
  });

  it('counts issues and rank-1 items separately', () => {
    expect(computeGearTodo(verify)).toMatchObject({ status: 'alert', issues: 3, minor: 2 });
    expect(
      computeGearTodo({
        results: [{ slot: 'legs', isValid: true, reason: 'valid', craftingQuality: 1 }],
        gems: [],
      }),
    ).toMatchObject({ status: 'warning', issues: 0, minor: 1 });
    expect(
      computeGearTodo({ results: [{ slot: 'legs', isValid: true, reason: 'valid' }], gems: [] }),
    ).toMatchObject({ status: 'ok', issues: 0, minor: 0 });
  });

  it('stays neutral before any gear check', () => {
    expect(computeGearTodo(undefined).status).toBe('neutral');
    expect(computeGearTodo({ results: [], gems: [] }).status).toBe('neutral');
  });
});

describe('wishlist completion', () => {
  const wish = (itemId: number | null, priority = 0) => ({ itemId, priority });

  it('counts wanted items, weapons once', () => {
    const wishlist: WishlistRecord = {
      head: wish(1),
      neck: wish(2, 5),
      chest: wish(null),
      main_hand: wish(3),
      off_hand: wish(4),
    };
    expect(countWishlistFilled(wishlist)).toBe(2);
  });

  it('computes the status from the 80 % threshold', () => {
    const slots = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];
    const full = Object.fromEntries(slots.map((s, i) => [s, wish(i + 1)])) as WishlistRecord;
    expect(computeWishlistTodo(full)).toEqual({ status: 'ok', filled: 12, total: 15, percent: 80 });
    expect(computeWishlistTodo({ head: wish(1) })).toMatchObject({ status: 'warning', filled: 1 });
    expect(computeWishlistTodo({})).toMatchObject({ status: 'alert', filled: 0 });
    expect(computeWishlistTodo(undefined).status).toBe('neutral');
  });
});

describe('boss upgrades', () => {
  const item = (id: number, dpsGain: number | null, isUpgrade: boolean, isWishlist = false) =>
    ({ id, dpsGain, isUpgrade, isWishlist }) as CharacterBossUpgradeItem;
  const boss = (id: number, name: string, items: CharacterBossUpgradeItem[], bestGain: number) =>
    ({ boss: { id, name }, items, stats: { bestGain } }) as unknown as CharacterBossUpgrade;

  const bosses = [
    boss(1, 'A', [item(11, 500, true), item(12, null, false)], 500),
    boss(2, 'B', [item(21, 2000, true), item(22, 900, true), item(23, 0, true)], 2000),
    boss(3, 'C', [item(31, -10, false, true)], 0),
  ];

  it('lists the best gains across bosses', () => {
    expect(topUpgrades(bosses, 2).map((u) => [u.item.id, u.bossName])).toEqual([
      [21, 'B'],
      [22, 'B'],
    ]);
    expect(topUpgrades(bosses)).toHaveLength(3);
    expect(topUpgrades(undefined)).toEqual([]);
  });

  it('finds the boss with the best gain', () => {
    expect(bestBossId(bosses)).toBe(2);
    expect(bestBossId([bosses[2]])).toBeNull();
  });

  it('sorts loot: upgrades by gain, then wishlist, then the rest', () => {
    const loot = [
      item(1, null, false),
      item(2, -5, false, true),
      item(3, 100, true),
      item(4, 900, true),
    ];
    expect(sortBossLoot(loot).map((i) => i.id)).toEqual([4, 3, 2, 1]);
  });
});

describe('countTodoActions', () => {
  it('counts the cards that need an action', () => {
    expect(countTodoActions(['ok', 'warning', 'alert', 'neutral'])).toBe(2);
    expect(countTodoActions(['ok', 'neutral'])).toBe(0);
  });
});
