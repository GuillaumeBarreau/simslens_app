// Controller des upgrades mis en forme (SIMS-181) : chaque entrée vient d'un
// schéma Joi via validated(), et le royaume demandé est transmis au service.

const getUpgradesByNameItemDifficulty = vi.fn();
const getCharacterBossUpgrades = vi.fn();
const clearRealmUpgrades = vi.fn();

vi.mock('../item_upgrade.service', () => ({
  default: {
    getUpgradesByNameItemDifficulty: (...a: unknown[]) => getUpgradesByNameItemDifficulty(...a),
  },
}));
vi.mock('../usecases/getCharacterBossUpgrades', () => ({
  getCharacterBossUpgrades: (...a: unknown[]) => getCharacterBossUpgrades(...a),
}));
vi.mock('../usecases/clearRealmUpgrades', () => ({
  clearRealmUpgrades: (...a: unknown[]) => clearRealmUpgrades(...a),
}));

import type { RequestHandler } from 'express';

import {
  clearRealm,
  getByNameItemDifficulty,
  getCharacterBossUpgrades as bossHandler,
} from '../item_upgrade.controller';
import {
  bossUpgradesQuery,
  characterIdParam,
  nameItemDifficultyParam,
  realmRequiredQuery,
  realmScopeQuery,
} from '../item_upgrade.validation';

const { validateParams, validateQuery } = require('../../../shared/middleware/validate');

/** Passe la requête dans les middlewares de validation, comme la route. */
async function validatedRequest(req: Record<string, unknown>, middlewares: RequestHandler[]) {
  for (const middleware of middlewares) {
    await new Promise<void>((resolve, reject) =>
      middleware(req as never, {} as never, (err?: unknown) => (err ? reject(err) : resolve())),
    );
  }
  return req as never;
}

function res() {
  return { json: vi.fn() };
}

beforeEach(() => {
  getUpgradesByNameItemDifficulty.mockResolvedValue([]);
  getCharacterBossUpgrades.mockResolvedValue([]);
  clearRealmUpgrades.mockResolvedValue({ deleted: 2 });
});

describe('GET /1/upgrade/:name/:itemID/:difficulty', () => {
  it('transmet le royaume de la query au service', async () => {
    const req = await validatedRequest(
      { params: { name: 'Thrall', itemID: '5', difficulty: 'heroic' }, query: { realmId: '7' } },
      [validateParams(nameItemDifficultyParam), validateQuery(realmScopeQuery)],
    );
    await getByNameItemDifficulty(req, res() as never);
    expect(getUpgradesByNameItemDifficulty).toHaveBeenCalledWith('Thrall', 5, 'heroic', 7);
  });

  it('sans royaume, transmet null', async () => {
    const req = await validatedRequest(
      { params: { name: 'Thrall', itemID: '5', difficulty: 'heroic' }, query: {} },
      [validateParams(nameItemDifficultyParam), validateQuery(realmScopeQuery)],
    );
    await getByNameItemDifficulty(req, res() as never);
    expect(getUpgradesByNameItemDifficulty).toHaveBeenCalledWith('Thrall', 5, 'heroic', null);
  });

  it('refuse (500) une partie lue sans schéma', async () => {
    const req = await validatedRequest(
      { params: { name: 'Thrall', itemID: '5', difficulty: 'heroic' }, query: { realmId: '7' } },
      [validateParams(nameItemDifficultyParam)],
    );
    await expect(getByNameItemDifficulty(req, res() as never)).rejects.toMatchObject({
      statusCode: 500,
      code: 'unvalidated_request',
    });
    expect(getUpgradesByNameItemDifficulty).not.toHaveBeenCalled();
  });
});

describe('GET /1/upgrade/by-boss/character/:characterId', () => {
  it('passe les paramètres convertis par Joi', async () => {
    const req = await validatedRequest(
      {
        params: { characterId: '31' },
        query: { difficulty: 'heroic', extension: 'tww', season: '3', specializationId: '62' },
      },
      [validateParams(characterIdParam), validateQuery(bossUpgradesQuery)],
    );
    await bossHandler(req, res() as never);
    expect(getCharacterBossUpgrades).toHaveBeenCalledWith({
      characterId: 31,
      difficulty: 'heroic',
      extension: 'tww',
      season: '3',
      specializationId: 62,
    });
  });
});

describe('DELETE /1/upgrade', () => {
  it('efface le royaume de la query', async () => {
    const r = res();
    const req = await validatedRequest({ query: { realmId: '7' } }, [
      validateQuery(realmRequiredQuery),
    ]);
    await clearRealm(req, r as never);
    expect(clearRealmUpgrades).toHaveBeenCalledWith(7);
    expect(r.json).toHaveBeenCalledWith({ deleted: 2 });
  });
});
