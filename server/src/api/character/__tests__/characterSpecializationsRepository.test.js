// Off-specs et spés simulées d'un personnage, au niveau des requêtes (SIMS-212).
import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../character.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('character repository — replaceCharacterSpecializations', () => {
  function fakeTransaction() {
    const tx = {
      characters: { update: vi.fn().mockResolvedValue({}) },
      character_offspecs: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((callback) => callback(tx));
    return tx;
  }

  it('writes the primary spec and replaces the off-specs in one transaction', async () => {
    const tx = fakeTransaction();
    await repo.replaceCharacterSpecializations('5', {
      primary: { spec: 'Holy', specializationId: 65 },
      offSpecializationIds: [66, 70],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.characters.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { spec: 'Holy', specializationId: 65 },
    });
    expect(tx.character_offspecs.deleteMany).toHaveBeenCalledWith({ where: { characterId: 5 } });
    expect(tx.character_offspecs.createMany).toHaveBeenCalledWith({
      data: [
        { characterId: 5, specializationId: 66 },
        { characterId: 5, specializationId: 70 },
      ],
      skipDuplicates: true,
    });
  });

  it('leaves the primary spec alone and only clears the off-specs of an empty list', async () => {
    const tx = fakeTransaction();
    await repo.replaceCharacterSpecializations(5, { offSpecializationIds: [] });
    expect(tx.characters.update).not.toHaveBeenCalled();
    expect(tx.character_offspecs.deleteMany).toHaveBeenCalledWith({ where: { characterId: 5 } });
    expect(tx.character_offspecs.createMany).not.toHaveBeenCalled();
  });
});

describe('character repository — listOffSpecializationIds', () => {
  it('reads the off-specs of the character only', async () => {
    const findMany = vi
      .spyOn(prisma.character_offspecs, 'findMany')
      .mockResolvedValue([{ specializationId: 65 }, { specializationId: 70 }]);
    await expect(repo.listOffSpecializationIds('5')).resolves.toEqual([65, 70]);
    expect(findMany.mock.calls[0][0].where).toEqual({ characterId: 5 });
  });
});

describe('character repository — listSimmedSpecializationIds', () => {
  it('merges the specs of the upgrades and of the gear snapshots, without duplicates', async () => {
    const upgrades = vi
      .spyOn(prisma.upgrades, 'findMany')
      .mockResolvedValue([{ specializationId: 70 }, { specializationId: 65 }]);
    const snapshots = vi
      .spyOn(prisma.character_gear_snapshots, 'findMany')
      .mockResolvedValue([{ specializationId: 70 }]);
    await expect(repo.listSimmedSpecializationIds('5')).resolves.toEqual([70, 65]);
    expect(upgrades.mock.calls[0][0].where).toEqual({
      characterID: 5,
      specializationId: { not: null },
    });
    expect(snapshots.mock.calls[0][0].where).toEqual({
      characterId: 5,
      specializationId: { not: null },
    });
  });
});
