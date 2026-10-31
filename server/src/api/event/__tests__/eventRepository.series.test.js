import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../event.repository');
const seriesRepo = require('../eventSeries.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('event repository — create (SIMS-200)', () => {
  it('links an occurrence to its series through the relation', async () => {
    const create = vi.spyOn(prisma.raid_events, 'create').mockResolvedValue({ id: 1 });
    const occurrenceDate = new Date('2026-10-14T00:00:00Z');

    await repo.create({
      realmId: 3,
      title: 'Raid',
      startTime: new Date(),
      endTime: new Date(),
      seriesId: 9,
      seriesOccurrenceDate: occurrenceDate,
      createdBy: '42',
    });

    const { data } = create.mock.calls[0][0];
    expect(data.series).toEqual({ connect: { id: 9 } });
    expect(data.seriesOccurrenceDate).toBe(occurrenceDate);
    expect(data).not.toHaveProperty('seriesId');
  });

  it('creates a standalone event without any series', async () => {
    const create = vi.spyOn(prisma.raid_events, 'create').mockResolvedValue({ id: 1 });
    await repo.create({ realmId: 3, title: 'Raid', startTime: new Date(), endTime: new Date() });
    expect(create.mock.calls[0][0].data).not.toHaveProperty('series');
  });
});

describe('event series repository — findUpcomingOccurrences', () => {
  it('only returns scheduled, upcoming occurrences from the series date', async () => {
    const findMany = vi.spyOn(prisma.raid_events, 'findMany').mockResolvedValue([]);
    const from = new Date('2026-10-21T00:00:00Z');
    const now = new Date('2026-10-10T12:00:00Z');

    await seriesRepo.findUpcomingOccurrences(9, from, now);

    expect(findMany.mock.calls[0][0].where).toEqual({
      seriesId: 9,
      status: 'SCHEDULED',
      seriesOccurrenceDate: { gte: from },
      startTime: { gt: now },
    });
  });
});
