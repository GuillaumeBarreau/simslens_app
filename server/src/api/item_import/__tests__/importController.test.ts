// Controller de l'import mis en forme (SIMS-181) : le corps et la query sont
// lus via validated(), et le royaume transmis au service est celui contrôlé.

const processImport = vi.fn();
const getLootsGroupedByCharacter = vi.fn();

vi.mock('../item_import.service', () => ({
  default: {
    processImport: (...a: unknown[]) => processImport(...a),
    getLootsGroupedByCharacter: (...a: unknown[]) => getLootsGroupedByCharacter(...a),
  },
}));

import type { RequestHandler } from 'express';

import { getLootsBulk, upload } from '../item_import.controller';

const { validateBody, validateQuery } = require('../../../shared/middleware/validate');
const { uploadSchema, bulkLootsQuery } = require('../item_import.validation');

async function validatedRequest(req: Record<string, unknown>, middleware: RequestHandler) {
  await new Promise<void>((resolve, reject) =>
    middleware(req as never, {} as never, (err?: unknown) => (err ? reject(err) : resolve())),
  );
  return req as never;
}

function res() {
  return { json: vi.fn() };
}

beforeEach(() => {
  processImport.mockResolvedValue({ success: true, importID: 3 });
  getLootsGroupedByCharacter.mockResolvedValue({ rows: [], grouped: {} });
});

describe('POST /1/import/upload', () => {
  it("transmet le royaume du corps et trace l'utilisateur", async () => {
    const r = res();
    const req = await validatedRequest(
      {
        body: { filename: 'loot.csv', rows: [{ player: 'Thrall' }], realmId: '7', instanceId: '4' },
        user: { id: 'u1' },
      },
      validateBody(uploadSchema),
    );
    await upload(req, r as never);
    expect(processImport).toHaveBeenCalledWith({
      filename: 'loot.csv',
      rows: [{ player: 'Thrall' }],
      realmId: 7,
      extension: undefined,
      season: undefined,
      instanceId: 4,
      actorInfo: { userId: 'u1', realmId: 7 },
    });
    expect(r.json).toHaveBeenCalledWith({ success: true, importID: 3 });
  });

  it('sans utilisateur (bot), importe sans auteur', async () => {
    const req = await validatedRequest(
      { body: { filename: 'loot.csv', rows: [], realmId: 7 } },
      validateBody(uploadSchema),
    );
    await upload(req, res() as never);
    expect(processImport.mock.calls[0][0].actorInfo).toEqual({ userId: null, realmId: 7 });
  });
});

describe('GET /1/import/loots/bulk', () => {
  it('lit les personnages demandés du royaume', async () => {
    const req = await validatedRequest(
      { query: { realmId: '7', characterIds: '1, 2' } },
      validateQuery(bulkLootsQuery),
    );
    await getLootsBulk(req, res() as never);
    expect(getLootsGroupedByCharacter).toHaveBeenCalledWith({ characterIds: [1, 2], realmId: 7 });
  });

  it('all=1 lit tout le royaume', async () => {
    const req = await validatedRequest(
      { query: { realmId: '7', all: '1', characterIds: '1' } },
      validateQuery(bulkLootsQuery),
    );
    await getLootsBulk(req, res() as never);
    expect(getLootsGroupedByCharacter).toHaveBeenCalledWith({ characterIds: null, realmId: 7 });
  });
});
