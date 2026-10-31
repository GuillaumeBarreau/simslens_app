import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * SIMS-234 : données de la spé retenue pour plusieurs personnages
 * (repository de l'optimiseur de loot).
 */
const { prisma } = require('../../../data');
const repo = require('../item_upgrade.repository');

const SHAMAN = {
  name: 'shaman',
  specializations: [{ id: 262, name: 'Elemental', icon: null, role: 'ranged' }],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getSimSpecializationContext', () => {
  it('ne lit rien sans personnage', async () => {
    const findMany = vi.spyOn(prisma.characters, 'findMany');
    await expect(repo.getSimSpecializationContext([], 'heroic')).resolves.toEqual({
      characters: [],
      sims: [],
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rattache la classe normalisée et résume les sims à la difficulté demandée', async () => {
    const findCharacters = vi.spyOn(prisma.characters, 'findMany').mockResolvedValue([
      { id: 1, class: 'Shaman', specializationId: 262 },
      { id: 2, class: null, specializationId: null },
    ]);
    const findClasses = vi.spyOn(prisma.classes, 'findMany').mockResolvedValue([SHAMAN]);
    const groupBy = vi.spyOn(prisma.upgrades, 'groupBy').mockResolvedValue([
      {
        characterID: 1,
        spec: 'Elemental Shaman',
        specializationId: 262,
        _max: { timeStamp: new Date('2026-10-01T00:00:00Z') },
      },
    ]);

    const context = await repo.getSimSpecializationContext([1, 1, 2], 'heroic');

    expect(findCharacters.mock.calls[0][0].where).toEqual({ id: { in: [1, 2] } });
    expect(findClasses.mock.calls[0][0].where).toEqual({ name: { in: ['shaman'] } });
    expect(groupBy.mock.calls[0][0]).toMatchObject({
      by: ['characterID', 'spec', 'specializationId'],
      where: { characterID: { in: [1, 2] }, difficulty: 'heroic' },
    });
    expect(context).toEqual({
      characters: [
        { id: 1, specializationId: 262, characterClass: SHAMAN },
        { id: 2, specializationId: null, characterClass: null },
      ],
      sims: [
        {
          characterID: 1,
          spec: 'Elemental Shaman',
          specializationId: 262,
          timeStamp: new Date('2026-10-01T00:00:00Z'),
        },
      ],
    });
  });
});
