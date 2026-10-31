// Seuil de fraîcheur des sims réglable par guilde (SIMS-228) : validation de la
// route, usecases de lecture et d'écriture, et requête d'upsert du repository.
vi.hoisted(() => {
  process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:1/test';
});

import { getValidationSettings } from '../usecases/getValidationSettings';
import { updateValidationSettings, validateSettings } from '../usecases/updateValidationSettings';
import { updateSettingsBody } from '../validation_settings.validation';

const getRealmById = vi.fn();
const getRealmOwner = vi.fn();
const readSettings = vi.fn();
const upsertValidationSettings = vi.fn();

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

beforeEach(() => {
  getRealmById.mockReset().mockResolvedValue({ id: 7 });
  getRealmOwner.mockReset().mockResolvedValue({ role: 'admin' });
  readSettings.mockReset().mockResolvedValue(null);
  upsertValidationSettings.mockReset().mockResolvedValue({ realmId: 7 });
});

/** Valide le corps comme le middleware validateBody de la route PUT. */
function validateBody(body: unknown) {
  return updateSettingsBody.validate(body, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
}

describe('validation Joi de simStaleAfterDays', () => {
  it('accepte un entier de 1 à 60', () => {
    for (const days of [1, 7, 14, 60]) {
      const { error, value } = validateBody({ simStaleAfterDays: days });
      expect(error).toBeUndefined();
      expect(value).toEqual({ simStaleAfterDays: days });
    }
  });

  it('convertit une chaîne numérique', () => {
    expect(validateBody({ simStaleAfterDays: '14' }).value).toEqual({ simStaleAfterDays: 14 });
  });

  it.each([0, -1, 61, 2.5, 'abc', null, true])('refuse %p', (days) => {
    const { error } = validateBody({ simStaleAfterDays: days });
    expect(error).toBeDefined();
    expect(error?.details[0].path).toEqual(['simStaleAfterDays']);
  });

  it('reste facultatif', () => {
    const { error, value } = validateBody({ fightLength: 300 });
    expect(error).toBeUndefined();
    expect(value).toEqual({ fightLength: 300 });
  });
});

describe('validateSettings (usecase)', () => {
  it('retient un seuil valide', () => {
    expect(validateSettings({ simStaleAfterDays: 3 })).toEqual({ simStaleAfterDays: 3 });
  });

  it.each([0, 61, 1.5, Number.NaN])('refuse %p (400)', (days) => {
    expect(() => validateSettings({ simStaleAfterDays: days })).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('ne fixe pas de seuil quand il est absent', () => {
    expect(validateSettings({ fightLength: 300 })).not.toHaveProperty('simStaleAfterDays');
  });
});

describe('usecases : seuil de la guilde', () => {
  it('lit le seuil enregistré par la guilde', async () => {
    readSettings.mockResolvedValueOnce({ realmId: 7, fightLength: 300, simStaleAfterDays: 14 });
    await expect(getValidationSettings({ realmId: 7, checkedRealmId: 7 })).resolves.toMatchObject({
      isDefault: false,
      simStaleAfterDays: 14,
    });
  });

  it('retombe sur 7 jours sans réglage enregistré', async () => {
    await expect(getValidationSettings({ realmId: 7, checkedRealmId: 7 })).resolves.toMatchObject({
      isDefault: true,
      simStaleAfterDays: 7,
    });
  });

  it('enregistre le seuil choisi par un officier', async () => {
    await updateValidationSettings({
      realmId: 7,
      checkedRealmId: 7,
      settings: { fightLength: 300, simStaleAfterDays: 3 },
      requesterId: '1',
    });
    expect(upsertValidationSettings).toHaveBeenCalledWith(7, {
      fightLength: 300,
      simStaleAfterDays: 3,
    });
  });

  it('refuse un seuil hors bornes sans rien enregistrer (400)', async () => {
    await expect(
      updateValidationSettings({
        realmId: 7,
        checkedRealmId: 7,
        settings: { simStaleAfterDays: 90 },
        requesterId: '1',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(upsertValidationSettings).not.toHaveBeenCalled();
  });

  it('refuse un modérateur (403)', async () => {
    getRealmOwner.mockResolvedValueOnce({ role: 'moderator' });
    await expect(
      updateValidationSettings({
        realmId: 7,
        checkedRealmId: 7,
        settings: { simStaleAfterDays: 3 },
        requesterId: '1',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(upsertValidationSettings).not.toHaveBeenCalled();
  });
});

describe('repository : upsert du seuil', () => {
  // Le repository est en CommonJS et fait require('../../data') : on place un
  // Prisma factice dans le cache de modules Node avant de le charger.
  const queryRaw = vi.fn();
  const dataPath = require.resolve('../../../data');
  const repoPath = require.resolve('../validation_settings.repository');
  let repository: {
    upsertValidationSettings(realmId: number, settings: Record<string, unknown>): Promise<unknown>;
  };

  beforeAll(() => {
    require.cache[dataPath] = {
      id: dataPath,
      filename: dataPath,
      loaded: true,
      exports: { prisma: { $queryRaw: (...a: unknown[]) => queryRaw(...a) } },
    } as unknown as NodeJS.Module;
    delete require.cache[repoPath];
    repository = require('../validation_settings.repository');
  });

  afterAll(() => {
    delete require.cache[dataPath];
    delete require.cache[repoPath];
  });

  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([{ realmId: 7, simStaleAfterDays: 14 }]);
  });

  const settings = {
    allowedFightStyles: ['Patchwerk'],
    fightLength: 300,
    enemyCount: 1,
    raidBuffsConfig: { bloodlust: true },
  };

  function sqlOf(call: unknown[]) {
    return (call[0] as TemplateStringsArray).join('?');
  }

  it('écrit le seuil fourni', async () => {
    await expect(
      repository.upsertValidationSettings(7, { ...settings, simStaleAfterDays: 14 }),
    ).resolves.toEqual({ realmId: 7, simStaleAfterDays: 14 });

    const call = queryRaw.mock.calls[0];
    expect(sqlOf(call)).toContain('"simStaleAfterDays" = COALESCE(');
    // Valeur pour l'insertion, défaut de la colonne, valeur pour la mise à jour.
    expect(call.slice(-3)).toEqual([14, 7, 14]);
  });

  it('garde la valeur enregistrée quand le seuil est absent', async () => {
    await repository.upsertValidationSettings(7, settings);

    const call = queryRaw.mock.calls[0];
    expect(sqlOf(call)).toContain('validation_settings."simStaleAfterDays")');
    expect(call.slice(-3)).toEqual([null, 7, null]);
  });
});
