// Garde au niveau de la requête : la sync Blizzard ne remplit qu'une spé vide
// et n'écrase jamais une spé choisie à la main (SIMS-208).
import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../character.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('character repository — fillSpecializationIfEmpty', () => {
  it('writes only when specializationId is null and spec is null, empty or the legacy dps', async () => {
    const updateMany = vi.spyOn(prisma.characters, 'updateMany').mockResolvedValue({ count: 1 });
    await expect(
      repo.fillSpecializationIfEmpty('5', { spec: 'Frost', specializationId: 251 }),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 5,
        specializationId: null,
        OR: [{ spec: null }, { spec: '' }, { spec: { equals: 'dps', mode: 'insensitive' } }],
      },
      data: { spec: 'Frost', specializationId: 251 },
    });
  });

  it('reports that nothing was written when the character already has a spec', async () => {
    vi.spyOn(prisma.characters, 'updateMany').mockResolvedValue({ count: 0 });
    await expect(
      repo.fillSpecializationIfEmpty(5, { spec: 'Frost', specializationId: 251 }),
    ).resolves.toBe(false);
  });
});
