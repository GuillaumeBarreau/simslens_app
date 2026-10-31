import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Correctif SIMS-181 : POST /1/import/upload vérifie le royaume du corps,
 * mais rattachait l'import à n'importe quelle instance (instanceId). Une
 * instance n'est désormais rattachée que si elle appartient à ce royaume.
 */
const { prisma } = require('../../../data');
const repo = require('../item_import.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('item_import repository — instance rattachée au royaume', () => {
  it("cherche l'instance dans le royaume de l'import avant de créer l'import", async () => {
    const findFirst = vi.spyOn(prisma.instances, 'findFirst').mockResolvedValue({ id: 4 });
    const create = vi.spyOn(prisma.imports, 'create').mockResolvedValue({ id: 12 });

    await expect(
      repo.createImportRecord('loot.csv', 100, 3, { instanceId: 4, realmId: 7 }),
    ).resolves.toBe(12);

    expect(findFirst).toHaveBeenCalledWith({ where: { id: 4, realmId: 7 }, select: { id: true } });
    expect(create.mock.calls[0][0].data.instanceId).toBe(4);
  });

  it("refuse (404) l'instance d'un autre royaume sans rien créer", async () => {
    vi.spyOn(prisma.instances, 'findFirst').mockResolvedValue(null);
    const create = vi.spyOn(prisma.imports, 'create').mockResolvedValue({ id: 12 });

    await expect(
      repo.createImportRecord('loot.csv', 100, 3, { instanceId: 4, realmId: 8 }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(create).not.toHaveBeenCalled();
  });

  it('refuse une instance sans royaume pour la contrôler', async () => {
    const findFirst = vi.spyOn(prisma.instances, 'findFirst').mockResolvedValue({ id: 4 });
    const create = vi.spyOn(prisma.imports, 'create').mockResolvedValue({ id: 12 });

    await expect(
      repo.createImportRecord('loot.csv', 100, 3, { instanceId: 4 }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(findFirst).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('sans instance, crée l’import sans lecture supplémentaire (sync_loot)', async () => {
    const findFirst = vi.spyOn(prisma.instances, 'findFirst');
    const create = vi.spyOn(prisma.imports, 'create').mockResolvedValue({ id: 12 });

    await expect(repo.createImportRecord('live-1', 100, 3)).resolves.toBe(12);
    expect(findFirst).not.toHaveBeenCalled();
    expect(create.mock.calls[0][0].data.instanceId).toBeNull();
  });
});
