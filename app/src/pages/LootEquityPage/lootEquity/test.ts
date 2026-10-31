import type { LootEquityPlayer } from 'services/attendance.service';

import {
  filterAndSortPlayers,
  formatDropDate,
  formatGain,
  formatPercent,
  itemsPerRaid,
  toLocalIsoDate,
} from './lootEquity';

describe('dates', () => {
  it('shows the drop time as entered in game, in UTC', () => {
    expect(formatDropDate('2026-05-15T23:30:00.000Z', 'en-GB')).toBe('15/05/2026, 23:30');
  });

  it('builds a period bound from the local calendar day', () => {
    // 00:30 heure locale : toISOString() donnerait la veille à l'est de l'UTC.
    expect(toLocalIsoDate(new Date(2026, 4, 1, 0, 30))).toBe('2026-05-01');
    expect(toLocalIsoDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });
});

const player = (over: Partial<LootEquityPlayer> = {}): LootEquityPlayer => ({
  characterId: 1,
  name: 'Thrall',
  class: 'shaman',
  spec: 'Elemental',
  role: 'RANGED',
  thumbnail: null,
  itemsReceived: 2,
  items: [],
  knownGainCount: 2,
  averageGainPercent: 1.5,
  cumulativeGainPercent: 3,
  bisReceived: 1,
  bisObtained: 3,
  bisTotal: 6,
  bisFillRate: 0.5,
  present: 4,
  totalRaids: 5,
  presenceRate: 0.8,
  ...over,
});

const names = (players: LootEquityPlayer[]) => players.map((p) => p.name);

describe('itemsPerRaid', () => {
  it('divides the items received by the raids attended', () => {
    expect(itemsPerRaid(player({ itemsReceived: 3, present: 4 }))).toBe(0.75);
  });

  it('is unknown without any raid attended', () => {
    expect(itemsPerRaid(player({ present: 0 }))).toBeNull();
  });
});

describe('filterAndSortPlayers', () => {
  const players = [
    player({ characterId: 1, name: 'Anduin', role: 'HEALER', averageGainPercent: 0.5 }),
    player({ characterId: 2, name: 'Garrosh', role: 'TANK', averageGainPercent: null }),
    player({ characterId: 3, name: 'Jaina', role: 'RANGED', averageGainPercent: 3 }),
    player({ characterId: 4, name: 'Thrall', role: 'RANGED', averageGainPercent: 1 }),
  ];

  it('keeps only the selected role', () => {
    expect(names(filterAndSortPlayers(players, 'RANGED', 'name', 'asc'))).toEqual([
      'Jaina',
      'Thrall',
    ]);
  });

  it('sorts by a numeric column in both directions, unknown values last', () => {
    expect(names(filterAndSortPlayers(players, 'ALL', 'averageGainPercent', 'desc'))).toEqual([
      'Jaina',
      'Thrall',
      'Anduin',
      'Garrosh',
    ]);
    expect(names(filterAndSortPlayers(players, 'ALL', 'averageGainPercent', 'asc'))).toEqual([
      'Anduin',
      'Thrall',
      'Jaina',
      'Garrosh',
    ]);
  });

  it('sorts by name', () => {
    expect(names(filterAndSortPlayers(players, 'ALL', 'name', 'desc'))).toEqual([
      'Thrall',
      'Jaina',
      'Garrosh',
      'Anduin',
    ]);
  });

  it('sorts by items per raid attended', () => {
    const list = [
      player({ name: 'A', itemsReceived: 4, present: 2 }),
      player({ name: 'B', itemsReceived: 1, present: 4 }),
      player({ name: 'C', itemsReceived: 1, present: 0 }),
    ];
    expect(names(filterAndSortPlayers(list, 'ALL', 'itemsPerRaid', 'desc'))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('does not mutate the list it receives', () => {
    const copy = [...players];
    filterAndSortPlayers(players, 'ALL', 'name', 'desc');
    expect(players).toEqual(copy);
  });
});

describe('formatting', () => {
  it('formats a rate, unknown as a dash', () => {
    expect(formatPercent(0.756)).toBe('76%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats a signed gain', () => {
    expect(formatGain(2.5)).toBe('+2.50%');
    expect(formatGain(-0.4)).toBe('-0.40%');
    expect(formatGain(null)).toBe('—');
  });
});
