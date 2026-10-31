import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Protections portées par le where des requêtes (SIMS-182).
 */
const { prisma } = require('../../../data');
const repo = require('../realm.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('realm repository — addCharacterToRealm', () => {
  it('only attaches a character without realm, or already in this one', async () => {
    const updateMany = vi.spyOn(prisma.characters, 'updateMany').mockResolvedValue({ count: 1 });

    await expect(repo.addCharacterToRealm(10, 3)).resolves.toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 10, OR: [{ realmId: null }, { realmId: 3 }] },
      data: { realmId: 3 },
    });
  });

  it('reports 0 when the character belongs to another realm', async () => {
    vi.spyOn(prisma.characters, 'updateMany').mockResolvedValue({ count: 0 });
    await expect(repo.addCharacterToRealm(10, 3)).resolves.toBe(0);
  });

  it('never uses an unconditional update', async () => {
    vi.spyOn(prisma.characters, 'updateMany').mockResolvedValue({ count: 1 });
    const update = vi.spyOn(prisma.characters, 'update');
    await repo.addCharacterToRealm(10, 3);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('realm repository — owners scoped to their realm', () => {
  it('removes an owner only within the given realm and reports the count', async () => {
    const deleteMany = vi.spyOn(prisma.realm_owners, 'deleteMany').mockResolvedValue({ count: 0 });

    await expect(repo.removeRealmOwner(3, 'bob')).resolves.toBe(0);
    expect(deleteMany).toHaveBeenCalledWith({ where: { realmId: 3, ownerId: 'bob' } });
  });

  it('updates an owner role only within the given realm and reports the count', async () => {
    const updateMany = vi.spyOn(prisma.realm_owners, 'updateMany').mockResolvedValue({ count: 1 });

    await expect(repo.updateRealmOwnerRole(3, 'bob', 'admin')).resolves.toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { realmId: 3, ownerId: 'bob' },
      data: { role: 'admin' },
    });
  });
});
