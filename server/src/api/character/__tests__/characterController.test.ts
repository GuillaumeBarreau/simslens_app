// Controller des personnages (SIMS-161) : chaque entrée vient d'un schéma Joi
// via validated(), et les écritures portent sur le royaume vérifié par
// checkPermission, jamais sur un royaume lu dans la requête brute.

const listCharacters = vi.fn();
const getAllCharacterGear = vi.fn();
const getKeyHistory = vi.fn();
const updateAllCharacters = vi.fn();
const updateCharacter = vi.fn();
const archiveCharacter = vi.fn();
const syncCharacterFromBlizzard = vi.fn();
const checkCharacterMount = vi.fn();
const getCharacterByDiscordTag = vi.fn();

vi.mock('../usecases', () => ({
  listCharacters: (...a: unknown[]) => listCharacters(...a),
  getAllCharacterGear: (...a: unknown[]) => getAllCharacterGear(...a),
  getKeyHistory: (...a: unknown[]) => getKeyHistory(...a),
  updateAllCharacters: (...a: unknown[]) => updateAllCharacters(...a),
  updateCharacter: (...a: unknown[]) => updateCharacter(...a),
  archiveCharacter: (...a: unknown[]) => archiveCharacter(...a),
  syncCharacterFromBlizzard: (...a: unknown[]) => syncCharacterFromBlizzard(...a),
  checkCharacterMount: (...a: unknown[]) => checkCharacterMount(...a),
  getCharacterByDiscordTag: (...a: unknown[]) => getCharacterByDiscordTag(...a),
}));

import type { RequestHandler } from 'express';

import * as controller from '../character.controller';
import {
  bulkGearQuery,
  checkMountParam,
  discordTagParam,
  idParam,
  keyHistoryQuery,
  listCharactersQuery,
  updateCharacterSchema,
} from '../character.validation';

const {
  validateBody,
  validateParams,
  validateQuery,
} = require('../../../shared/middleware/validate');

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
  const r = { json: vi.fn(), status: vi.fn() };
  r.status.mockReturnValue(r);
  return r;
}

beforeEach(() => {
  for (const fn of [
    listCharacters,
    getAllCharacterGear,
    getKeyHistory,
    updateAllCharacters,
    updateCharacter,
    archiveCharacter,
    syncCharacterFromBlizzard,
    checkCharacterMount,
    getCharacterByDiscordTag,
  ]) {
    fn.mockReset().mockResolvedValue({ ok: true });
  }
});

describe('GET /1/character', () => {
  it('passes the realm of the query, converted by Joi', async () => {
    const req = await validatedRequest({ query: { realmId: '3' } }, [
      validateQuery(listCharactersQuery),
    ]);
    await controller.list(req, res() as never);
    expect(listCharacters).toHaveBeenCalledWith(3);
  });

  it('refuses (500) a query read without schema', async () => {
    await expect(
      controller.list({ query: { realmId: '3' } } as never, res() as never),
    ).rejects.toMatchObject({ statusCode: 500, code: 'unvalidated_request' });
    expect(listCharacters).not.toHaveBeenCalled();
  });
});

describe('GET /1/character/gear/bulk', () => {
  it('passes the ids converted to numbers', async () => {
    const req = await validatedRequest({ query: { ids: '5, 6,7' } }, [
      validateQuery(bulkGearQuery),
    ]);
    await controller.getAllGear(req, res() as never);
    expect(getAllCharacterGear).toHaveBeenCalledWith([5, 6, 7]);
  });
});

describe('GET /1/character/keys/history', () => {
  it('passes the realm, the week as a date and the minimum level', async () => {
    const req = await validatedRequest(
      { query: { realmId: '3', weekStart: '2026-04-08T03:00:00.000Z', minLevel: '12' } },
      [validateQuery(keyHistoryQuery)],
    );
    await controller.getKeyHistory(req, res() as never);
    expect(getKeyHistory).toHaveBeenCalledWith({
      realmId: 3,
      weekStart: new Date('2026-04-08T03:00:00.000Z'),
      minLevel: 12,
    });
  });
});

describe('GET /1/character/:characterId/mount/:mountId', () => {
  it('passes both identifiers converted by Joi', async () => {
    const req = await validatedRequest({ params: { characterId: '5', mountId: '7' } }, [
      validateParams(checkMountParam),
    ]);
    await controller.checkMount(req, res() as never);
    expect(checkCharacterMount).toHaveBeenCalledWith(5, 7);
  });
});

describe('GET /1/character/discord/:tag', () => {
  it('passes the tag of the route', async () => {
    const req = await validatedRequest({ params: { tag: 'arthas' } }, [
      validateParams(discordTagParam),
    ]);
    await controller.getByDiscordTag(req, res() as never);
    expect(getCharacterByDiscordTag).toHaveBeenCalledWith('arthas');
  });
});

describe('routes protected by checkPermission', () => {
  it('POST /update-all updates the checked realm, not the one of the body', async () => {
    const r = res();
    const req = { realmId: 3, realmRole: 'admin', body: { realmId: 9 } } as never;
    await controller.updateAll(req, r as never);
    expect(updateAllCharacters).toHaveBeenCalledWith({ concurrency: 3, realmId: 3 });
    expect(r.json).toHaveBeenCalledWith({
      message: 'All characters updated successfully.',
      result: { ok: true },
    });
  });

  it('refuses (500) a realm set by injectRealmId alone, without checkPermission', async () => {
    // injectRealmId pose req.realmId depuis la requête, sans vérification.
    await expect(
      controller.updateAll({ realmId: 9, body: { realmId: 9 } } as never, res() as never),
    ).rejects.toMatchObject({ statusCode: 500, code: 'unchecked_realm' });
    expect(updateAllCharacters).not.toHaveBeenCalled();
  });

  it('POST /update-all refuses (500) a route mounted without checkPermission', async () => {
    await expect(
      controller.updateAll({ body: { realmId: 9 } } as never, res() as never),
    ).rejects.toMatchObject({ statusCode: 500, code: 'unchecked_realm' });
    expect(updateAllCharacters).not.toHaveBeenCalled();
  });

  it('POST /:id updates the character within the checked realm', async () => {
    const req = await validatedRequest(
      { realmId: 3, realmRole: 'admin', params: { id: '5' }, body: { name: 'Uther' } },
      [validateParams(idParam), validateBody(updateCharacterSchema)],
    );
    await controller.update(req, res() as never);
    expect(updateCharacter).toHaveBeenCalledWith(5, 3, { name: 'Uther' }, { selfEdit: false });
  });

  it('POST /:id marks a member editing his own character as self-edit (SIMS-196)', async () => {
    // checkPermission(EDIT_ROSTER, { allowSelfEdit }) laisse passer le propriétaire.
    const req = await validatedRequest(
      { realmId: 3, realmRole: 'member', params: { id: '5' }, body: { status: 'approved' } },
      [validateParams(idParam), validateBody(updateCharacterSchema)],
    );
    await controller.update(req, res() as never);
    expect(updateCharacter).toHaveBeenCalledWith(5, 3, { status: 'approved' }, { selfEdit: true });
  });

  it('DELETE /:id archives the character within the checked realm', async () => {
    const req = await validatedRequest({ realmId: 3, realmRole: 'admin', params: { id: '5' } }, [
      validateParams(idParam),
    ]);
    await controller.archive(req, res() as never);
    expect(archiveCharacter).toHaveBeenCalledWith(5, 3);
  });
});
