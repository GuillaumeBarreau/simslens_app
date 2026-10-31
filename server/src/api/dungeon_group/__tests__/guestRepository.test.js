import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Le cœur du correctif SIMS-176 : un invité n'est modifié ou supprimé que
 * dans le groupe de la route, dont le royaume a été vérifié. Sans groupId
 * dans le where, un officier atteindrait l'invité d'une autre guilde.
 */
const { prisma } = require('../../../data');
const repo = require('../dungeon_group.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dungeon_group repository — guests scoped to their group', () => {
  it('removes a guest only within the given group', async () => {
    const deleteMany = vi
      .spyOn(prisma.dungeon_group_guests, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    await expect(repo.removeGuest(4, 9)).resolves.toEqual({ count: 0 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 9, groupId: 4 } });
  });

  it('updates a guest only within the given group', async () => {
    const updateMany = vi
      .spyOn(prisma.dungeon_group_guests, 'updateMany')
      .mockResolvedValue({ count: 1 });
    await repo.updateGuest(4, 9, { slotId: 'slot-TANK' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 9, groupId: 4 },
      data: { slotId: 'slot-TANK' },
    });
  });
});
