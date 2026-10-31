import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../guest.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('guest repository — belongsToEvent', () => {
  it('matches the guest on both its id and its event', async () => {
    const count = vi.spyOn(prisma.raid_guests, 'count').mockResolvedValue(1);
    await expect(repo.belongsToEvent(4, 7)).resolves.toBe(true);
    expect(count).toHaveBeenCalledWith({ where: { id: 4, eventId: 7 } });
  });

  it('is false for a guest of another event', async () => {
    vi.spyOn(prisma.raid_guests, 'count').mockResolvedValue(0);
    await expect(repo.belongsToEvent(4, 7)).resolves.toBe(false);
  });
});
