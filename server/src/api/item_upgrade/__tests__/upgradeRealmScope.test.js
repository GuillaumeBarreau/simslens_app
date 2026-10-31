import { afterEach, describe, expect, it, vi } from 'vitest';

import { characterIdParam } from '../item_upgrade.validation';

/**
 * Correctif SIMS-181 : GET /1/upgrade/:name/:itemID/:difficulty?realmId=
 * transmettait le royaume au service, qui l'ignorait. Le personnage était
 * alors cherché par son seul nom, toutes guildes confondues. Le passage du
 * royaume par le controller est testé dans upgradeController.test.ts.
 */
const { prisma } = require('../../../data');
const repo = require('../item_upgrade.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('listUpgradesByCharacterNameItemAndDifficulty — personnage du royaume', () => {
  it('cherche le personnage dans le royaume demandé', async () => {
    const findFirst = vi.spyOn(prisma.characters, 'findFirst').mockResolvedValue(null);
    const findMany = vi.spyOn(prisma.upgrades, 'findMany');
    await expect(
      repo.listUpgradesByCharacterNameItemAndDifficulty('Thrall', 5, 'heroic', 7),
    ).resolves.toEqual([]);
    expect(findFirst).toHaveBeenCalledWith({ where: { name: 'Thrall', realmId: 7 } });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('lit les upgrades du personnage trouvé dans ce royaume', async () => {
    vi.spyOn(prisma.characters, 'findFirst').mockResolvedValue({ id: 31 });
    const findMany = vi.spyOn(prisma.upgrades, 'findMany').mockResolvedValue([]);
    await repo.listUpgradesByCharacterNameItemAndDifficulty('Thrall', 5, 'heroic', 7);
    expect(findMany.mock.calls[0][0].where).toEqual({
      characterID: 31,
      itemID: 5,
      difficulty: 'heroic',
    });
  });
});

describe('characterIdParam — chiffres seuls', () => {
  it.each(['1e1', '1.5', '01', '-3'])('refuse %s', (characterId) => {
    expect(characterIdParam.validate({ characterId }).error).toBeDefined();
  });

  it('convertit un identifiant en nombre', () => {
    expect(characterIdParam.validate({ characterId: '42' }).value).toEqual({ characterId: 42 });
  });
});
