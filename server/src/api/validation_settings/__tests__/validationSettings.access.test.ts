import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Request, RequestHandler, Response } from 'express';

import { getValidationSettings as getSettingsUsecase } from '../usecases/getValidationSettings';
import { updateValidationSettings as updateSettingsUsecase } from '../usecases/updateValidationSettings';
import { realmIdParam, updateSettingsBody } from '../validation_settings.validation';

// Réglages de validation : lecture ouverte aux membres, écriture aux gestionnaires,
// et toujours sur le royaume vérifié par checkPermission (SIMS-137).

const getValidationSettings = vi.fn();
const updateValidationSettings = vi.fn();
const getRealmById = vi.fn();
const getRealmOwner = vi.fn();
const readSettings = vi.fn();
const upsertValidationSettings = vi.fn();

vi.mock('../usecases', () => ({
  getValidationSettings: (...a: unknown[]) => getValidationSettings(...a),
  updateValidationSettings: (...a: unknown[]) => updateValidationSettings(...a),
}));

vi.mock('../../realm/realm.repository', () => ({
  default: {
    getRealmById: (...a: unknown[]) => getRealmById(...a),
    getRealmOwner: (...a: unknown[]) => getRealmOwner(...a),
  },
}));

vi.mock('../validation_settings.repository', () => ({
  default: {
    getValidationSettings: (...a: unknown[]) => readSettings(...a),
    upsertValidationSettings: (...a: unknown[]) => upsertValidationSettings(...a),
  },
}));

import { getSettings, updateSettings } from '../validation_settings.controller';

const { validateBody, validateParams } = require('../../../shared/middleware/validate');

function res() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

/** Passe la requête dans les middlewares de validation de la route, puis le handler. */
async function run(
  middlewares: RequestHandler[],
  handler: (req: Request, res: Response) => Promise<void>,
  req: Record<string, unknown>,
) {
  for (const middleware of middlewares) {
    let failure: unknown;
    middleware(req as never, {} as never, (err?: unknown) => {
      failure = err;
    });
    if (failure) throw failure;
  }
  const r = res();
  await handler(req as never, r as never);
  return r;
}

const getChain = [validateParams(realmIdParam)];
const putChain = [validateParams(realmIdParam), validateBody(updateSettingsBody)];

beforeEach(() => {
  getValidationSettings.mockReset().mockResolvedValue({ realmId: 7 });
  updateValidationSettings.mockReset().mockResolvedValue({ realmId: 7 });
  getRealmById.mockReset().mockResolvedValue({ id: 7 });
  getRealmOwner.mockReset().mockResolvedValue({ role: 'admin' });
  readSettings.mockReset().mockResolvedValue(null);
  upsertValidationSettings.mockReset().mockResolvedValue({ realmId: 7 });
});

describe('routes /validation_settings', () => {
  it('lecture derrière VIEW_ROSTER, écriture derrière MANAGE_REALM', () => {
    const source = readFileSync(
      path.join(__dirname, '..', 'validation_settings.routes.ts'),
      'utf8',
    );
    expect(source).toMatch(
      /router\.get\(\s*'\/:realmId',\s*checkPermission\(Permission\.VIEW_ROSTER\),\s*validateParams\(realmIdParam\),\s*controller\.getSettings,?\s*\)/,
    );
    expect(source).toMatch(
      /router\.put\(\s*'\/:realmId',\s*checkPermission\(Permission\.MANAGE_REALM\),\s*validateParams\(realmIdParam\),\s*validateBody\(updateSettingsBody\),\s*controller\.updateSettings,?\s*\)/,
    );
  });

  it('refuse un :realmId que checkPermission lirait autrement (1e1)', () => {
    expect(realmIdParam.validate({ realmId: '1e1' }).error).toBeDefined();
    expect(realmIdParam.validate({ realmId: '7' }).value.realmId).toBe(7);
  });

  it('ne retient que les champs de réglage connus', () => {
    const { value } = updateSettingsBody.validate(
      { fightLength: 300, realmId: 9, isDefault: true },
      { stripUnknown: true },
    );
    expect(value).toEqual({ fightLength: 300 });
  });
});

describe('contrôleur : royaume vérifié', () => {
  it('lit les réglages du royaume vérifié', async () => {
    const r = await run(getChain, getSettings, { params: { realmId: '7' }, realmId: 7 });
    expect(getValidationSettings).toHaveBeenCalledWith({ realmId: 7, checkedRealmId: 7 });
    expect(r.json).toHaveBeenCalledWith({ realmId: 7 });
  });

  it('transmet au usecase le royaume de l’URL et le royaume vérifié', async () => {
    await run(getChain, getSettings, { params: { realmId: '8' }, realmId: 7 });
    expect(getValidationSettings).toHaveBeenCalledWith({ realmId: 8, checkedRealmId: 7 });
  });

  it('modifie le royaume vérifié', async () => {
    const body = { fightLength: 300 };
    const req = { params: { realmId: '7' }, realmId: 7, user: { id: '1' }, body };
    const r = await run(putChain, updateSettings, req);
    expect(updateValidationSettings).toHaveBeenCalledWith({
      realmId: 7,
      checkedRealmId: 7,
      settings: body,
      requesterId: '1',
    });
    expect(r.json).toHaveBeenCalledWith({ realmId: 7 });
  });

  it('exige un utilisateur connecté pour modifier (401)', async () => {
    const req = { params: { realmId: '7' }, realmId: 7, body: {} };
    await expect(run(putChain, updateSettings, req)).rejects.toMatchObject({ statusCode: 401 });
    expect(updateValidationSettings).not.toHaveBeenCalled();
  });
});

describe('usecases : royaume vérifié', () => {
  it('lit les réglages du royaume vérifié', async () => {
    await expect(getSettingsUsecase({ realmId: 7, checkedRealmId: 7 })).resolves.toMatchObject({
      realmId: 7,
      isDefault: true,
    });
    expect(readSettings).toHaveBeenCalledWith(7);
  });

  it('refuse de lire un autre royaume que celui vérifié (403)', async () => {
    await expect(getSettingsUsecase({ realmId: 8, checkedRealmId: 7 })).rejects.toMatchObject({
      statusCode: 403,
      code: 'forbidden',
    });
    expect(getRealmById).not.toHaveBeenCalled();
    expect(readSettings).not.toHaveBeenCalled();
  });

  it('refuse de lire sans royaume vérifié (403)', async () => {
    await expect(
      getSettingsUsecase({ realmId: 7, checkedRealmId: undefined }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(readSettings).not.toHaveBeenCalled();
  });

  it('refuse de modifier un autre royaume que celui vérifié (403)', async () => {
    await expect(
      updateSettingsUsecase({
        realmId: 8,
        checkedRealmId: 7,
        settings: { fightLength: 300 },
        requesterId: '1',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'forbidden' });
    expect(getRealmOwner).not.toHaveBeenCalled();
    expect(upsertValidationSettings).not.toHaveBeenCalled();
  });

  it('expose le seuil de péremption des sims, réglages par défaut ou enregistrés (SIMS-199)', async () => {
    await expect(getSettingsUsecase({ realmId: 7, checkedRealmId: 7 })).resolves.toMatchObject({
      isDefault: true,
      simStaleAfterDays: 7,
    });

    readSettings.mockResolvedValueOnce({ realmId: 7, fightLength: 240 });
    await expect(getSettingsUsecase({ realmId: 7, checkedRealmId: 7 })).resolves.toMatchObject({
      isDefault: false,
      fightLength: 240,
      simStaleAfterDays: 7,
    });
  });

  it('modifie le royaume vérifié', async () => {
    await updateSettingsUsecase({
      realmId: 7,
      checkedRealmId: 7,
      settings: { fightLength: 300 },
      requesterId: '1',
    });
    expect(upsertValidationSettings).toHaveBeenCalledWith(7, { fightLength: 300 });
  });
});
