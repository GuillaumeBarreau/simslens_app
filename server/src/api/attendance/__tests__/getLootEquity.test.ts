import { Prisma } from '@prisma/client';

import { getLootEquity } from '../usecases/getLootEquity';

/**
 * Équité du loot (SIMS-201) : tout est lu à partir des personnages du
 * royaume vérifié ; butin, sims et wishlists d'un autre royaume ne sont
 * jamais demandés.
 */

const findCharacters = vi.fn();
const findLoots = vi.fn();
const findWishlists = vi.fn();
const findItems = vi.fn();
const findTokens = vi.fn();
const findUpgrades = vi.fn();
const getAttendanceSummary = vi.fn();
const countEvents = vi.fn();

vi.mock('../../../data', () => ({
  prisma: {
    characters: { findMany: (...a: unknown[]) => findCharacters(...a) },
    imported_loots: { findMany: (...a: unknown[]) => findLoots(...a) },
    character_wishlists: { findMany: (...a: unknown[]) => findWishlists(...a) },
    items: { findMany: (...a: unknown[]) => findItems(...a) },
    item_tokens: { findMany: (...a: unknown[]) => findTokens(...a) },
    upgrades: { findMany: (...a: unknown[]) => findUpgrades(...a) },
    raid_events: { count: (...a: unknown[]) => countEvents(...a) },
  },
}));
vi.mock('../attendance.repository', () => ({
  default: { getAttendanceSummary: (...a: unknown[]) => getAttendanceSummary(...a) },
}));

const query = { realmId: 3, startDate: '2026-05-01', endDate: '2026-05-31' };

beforeEach(() => {
  findCharacters.mockReset().mockResolvedValue([
    {
      id: 1,
      name: 'Thrall',
      class: 'shaman',
      thumbnail: null,
      specializationId: 262,
      specialization: { name: 'Elemental', role: 'dps' },
    },
  ]);
  findLoots.mockReset().mockResolvedValue([
    {
      id: 10,
      characterID: 1,
      itemID: 500,
      date: '15/05/26',
      time: '21:00:00',
      response: 'BiS',
      instance: 'Manaforge Omega-Heroic',
    },
  ]);
  findWishlists
    .mockReset()
    .mockResolvedValue([{ characterId: 1, specializationId: 262, itemId: 600 }]);
  findItems.mockReset().mockResolvedValue([{ id: 500, name: 'Token', icon: 'inv_token' }]);
  findTokens
    .mockReset()
    .mockResolvedValue([{ tokenItemId: 500, rewardItemId: 600, class: 'shaman' }]);
  findUpgrades.mockReset().mockResolvedValue([
    {
      characterID: 1,
      itemID: 600,
      dps: 1050,
      baseDps: 1000,
      timeStamp: new Date('2026-05-14T00:00:00Z'),
      difficulty: 'heroic',
      spec: 'Elemental Shaman',
    },
  ]);
  countEvents.mockReset().mockResolvedValue(5);
  getAttendanceSummary
    .mockReset()
    .mockResolvedValue([{ characterId: 1, present: 2, totalRaids: 4, eventsCount: 5 }]);
});

describe('getLootEquity', () => {
  it('reads every source from the characters of the checked realm', async () => {
    await getLootEquity(query);

    expect(findCharacters).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { realmId: 3, archived: 0, status: { not: 'pending' } },
      }),
    );
    expect(findLoots.mock.calls[0][0].where).toEqual({ characterID: { in: [1] } });
    expect(findWishlists.mock.calls[0][0].where).toEqual({
      characterId: { in: [1] },
      itemId: { not: null },
    });
    expect(findUpgrades.mock.calls[0][0].where).toEqual({
      characterID: { in: [1] },
      itemID: { in: [500, 600] },
    });
    expect(getAttendanceSummary).toHaveBeenCalledWith({
      realmId: 3,
      startDate: new Date('2026-05-01T00:00:00Z'),
      endDate: new Date('2026-05-31T23:59:59.999Z'),
      includeOptional: false,
    });
  });

  it('assembles the equity table of the period', async () => {
    const report = await getLootEquity(query);

    expect(report).toMatchObject({
      range: { startDate: '2026-05-01T00:00:00.000Z', endDate: '2026-05-31T23:59:59.999Z' },
      includeOptional: false,
      eventsCount: 5,
    });
    expect(report.players).toHaveLength(1);
    expect(report.players[0]).toMatchObject({
      name: 'Thrall',
      role: 'RANGED',
      itemsReceived: 1,
      averageGainPercent: 5,
      bisFillRate: 1,
      presenceRate: 0.5,
    });
  });

  it('reads the gain frozen at import before the current sim (SIMS-229)', async () => {
    findLoots.mockResolvedValue([
      {
        id: 10,
        characterID: 1,
        itemID: 500,
        date: '15/05/26',
        time: '21:00:00',
        response: 'BiS',
        instance: 'Manaforge Omega-Heroic',
        upgradePercent: new Prisma.Decimal('3.25'),
        upgradeSimAt: new Date('2026-05-10T00:00:00Z'),
        upgradeMetric: 'hps',
      },
    ]);
    const report = await getLootEquity(query);

    expect(findLoots.mock.calls[0][0].select).toMatchObject({
      upgradePercent: true,
      upgradeSimAt: true,
      upgradeMetric: true,
    });
    expect(report.players[0].items[0]).toMatchObject({
      gainPercent: 3.25,
      gainMetric: 'hps',
      simulatedAt: '2026-05-10T00:00:00.000Z',
      gainSource: 'frozen',
    });
  });

  it('reads a frozen gain without metric as DPS', async () => {
    findLoots.mockResolvedValue([
      {
        id: 10,
        characterID: 1,
        itemID: 500,
        date: '15/05/26',
        time: '21:00:00',
        response: 'BiS',
        instance: 'Manaforge Omega-Heroic',
        upgradePercent: new Prisma.Decimal('1.5'),
        upgradeSimAt: new Date('2026-05-10T00:00:00Z'),
        upgradeMetric: null,
      },
    ]);
    const report = await getLootEquity(query);

    expect(report.players[0].items[0]).toMatchObject({
      gainPercent: 1.5,
      gainMetric: 'dps',
      gainSource: 'frozen',
    });
  });

  it('estimates the gain of a drop imported without a frozen gain', async () => {
    const report = await getLootEquity(query);
    expect(report.players[0].items[0]).toMatchObject({
      gainPercent: 5,
      gainSource: 'estimated',
    });
  });

  it('does not count a « not wanted » item as a BiS wish (SIMS-205)', async () => {
    findWishlists.mockResolvedValue([
      { characterId: 1, specializationId: 262, itemId: 600, priority: 5 },
    ]);
    const report = await getLootEquity(query);

    expect(report.players[0]).toMatchObject({ bisTotal: 0, bisFillRate: null });
  });

  it('keeps counting a wish of any other priority (SIMS-205)', async () => {
    findWishlists.mockResolvedValue([
      { characterId: 1, specializationId: 262, itemId: 600, priority: 1 },
    ]);
    const report = await getLootEquity(query);

    expect(report.players[0]).toMatchObject({ bisTotal: 1, bisFillRate: 1 });
  });

  it('ignores attendance rows of characters outside the realm list', async () => {
    getAttendanceSummary.mockResolvedValue([
      { characterId: 1, present: 2, totalRaids: 4, eventsCount: 5 },
      { characterId: 99, present: 4, totalRaids: 4, eventsCount: 5 },
    ]);
    const report = await getLootEquity(query);
    expect(report.players.map((p) => p.characterId)).toEqual([1]);
  });

  it('counts the raid nights of the realm, even when nobody signed up', async () => {
    getAttendanceSummary.mockResolvedValue([]);
    const report = await getLootEquity({ ...query, includeOptional: true });

    expect(report.eventsCount).toBe(5);
    expect(countEvents).toHaveBeenCalledWith({
      where: {
        realmId: 3,
        status: { not: 'CANCELLED' },
        startTime: {
          gte: new Date('2026-05-01T00:00:00Z'),
          lte: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
    });
  });

  it('leaves out the optional raids from the count unless asked', async () => {
    await getLootEquity(query);
    expect(countEvents.mock.calls[0][0].where.isOptional).toBe(false);
  });

  it('stops early for a realm without characters', async () => {
    findCharacters.mockResolvedValue([]);
    const report = await getLootEquity(query);

    expect(report.players).toEqual([]);
    expect(report.eventsCount).toBe(5);
    expect(findLoots).not.toHaveBeenCalled();
    expect(getAttendanceSummary).not.toHaveBeenCalled();
  });

  it('does not look up items or sims without any loot', async () => {
    findLoots.mockResolvedValue([]);
    await getLootEquity(query);

    expect(findItems).not.toHaveBeenCalled();
    expect(findTokens).not.toHaveBeenCalled();
    expect(findUpgrades).not.toHaveBeenCalled();
  });

  it('refuses a missing realm', async () => {
    await expect(getLootEquity({ ...query, realmId: 0 })).rejects.toMatchObject({
      statusCode: 400,
      code: 'missing_identifier',
    });
  });

  it('refuses a period longer than a year', async () => {
    await expect(
      getLootEquity({ ...query, startDate: '2024-01-01', endDate: '2026-01-01' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'range_too_large' });
  });
});
