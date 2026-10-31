import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * SIMS-178 : les membres sont lus et supprimés dans le groupe de la route,
 * et la suppression rend le nombre de lignes pour répondre 404 si l'utilisateur
 * n'en faisait pas partie.
 */
const { prisma } = require('../../../data');
const repo = require('../dungeon_group.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dungeon_group repository — members scoped to their group', () => {
  it('removes a member only within the given group and returns the count', async () => {
    const deleteMany = vi
      .spyOn(prisma.dungeon_group_members, 'deleteMany')
      .mockResolvedValue({ count: 0 });
    await expect(repo.removeMember(4, 'u1')).resolves.toEqual({ count: 0 });
    expect(deleteMany).toHaveBeenCalledWith({ where: { groupId: 4, userId: 'u1' } });
  });
});
