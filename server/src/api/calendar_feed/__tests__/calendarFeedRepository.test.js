import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../calendar_feed.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('calendar feed repository — tokens', () => {
  it('replaces the token of the player and resets its last use', async () => {
    const upsert = vi.spyOn(prisma.calendar_feed_tokens, 'upsert').mockResolvedValue({ id: 1 });

    await repo.upsertForUser('u1', 'hash');

    const args = upsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'u1' });
    expect(args.create).toMatchObject({ userId: 'u1', tokenHash: 'hash' });
    expect(args.update).toMatchObject({ tokenHash: 'hash', lastUsedAt: null });
    expect(args.update.createdAt).toBeInstanceOf(Date);
  });

  it('deletes only the token of the player', async () => {
    const deleteMany = vi
      .spyOn(prisma.calendar_feed_tokens, 'deleteMany')
      .mockResolvedValue({ count: 1 });

    await expect(repo.deleteForUser('u1')).resolves.toBe(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
  });
});

describe('calendar feed repository — feed content', () => {
  it('reads the active characters of the player attached to a realm', async () => {
    const findMany = vi.spyOn(prisma.characters, 'findMany').mockResolvedValue([]);

    await repo.findUserCharacters('u1');

    expect(findMany.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      archived: 0,
      status: { not: 'pending' },
      realmId: { not: null },
    });
  });

  it('leaves out a character still pending acceptance (Battle.net claim)', async () => {
    const findMany = vi.spyOn(prisma.characters, 'findMany').mockResolvedValue([]);

    await repo.findUserCharacters('u1');

    const { where } = findMany.mock.calls[0][0];
    expect(where.status).toEqual({ not: 'pending' });
    expect(where.archived).toBe(0);
  });

  it('merges the managed and guest realms of the player', async () => {
    vi.spyOn(prisma.realm_owners, 'findMany').mockResolvedValue([{ realmId: 1 }]);
    vi.spyOn(prisma.realm_user_guests, 'findMany').mockResolvedValue([{ realmId: 4 }]);

    await expect(repo.findManagedOrGuestRealmIds('u1')).resolves.toEqual([1, 4]);
  });

  it('only reads events of the given realms', async () => {
    const findMany = vi.spyOn(prisma.raid_events, 'findMany').mockResolvedValue([]);
    const from = new Date('2026-01-01T00:00:00Z');

    await repo.findEvents([1, 2], from, 50);

    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ realmId: { in: [1, 2] }, startTime: { gte: from } });
    expect(args.take).toBe(50);
  });

  it('only reads signups of the given characters', async () => {
    const findMany = vi.spyOn(prisma.raid_signups, 'findMany').mockResolvedValue([]);

    await repo.findSignups([7], [10]);

    expect(findMany.mock.calls[0][0].where).toEqual({
      eventId: { in: [7] },
      characterId: { in: [10] },
    });
  });
});
