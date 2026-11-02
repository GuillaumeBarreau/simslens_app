// Spé principale et off-specs d'un personnage (SIMS-212) : spés de la classe du
// personnage seulement (400 sinon), spé principale jamais aussi off-spec, et
// personnage rattaché au royaume vérifié par checkPermission.

import { CharacterNotFoundError } from '../character.errors';
import {
  buildCharacterSpecializations,
  getCharacterSpecializations,
  updateCharacterSpecializations,
} from '../usecases/characterSpecializations';
import { listClassSpecializations } from '../usecases/listClassSpecializations';

const findCharacterById = vi.fn();
const findClassWithSpecializations = vi.fn();
const listOffSpecializationIds = vi.fn();
const listSimmedSpecializationIds = vi.fn();
const replaceCharacterSpecializations = vi.fn();
const listClassesWithSpecializations = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    listOffSpecializationIds: (...a: unknown[]) => listOffSpecializationIds(...a),
    listSimmedSpecializationIds: (...a: unknown[]) => listSimmedSpecializationIds(...a),
    replaceCharacterSpecializations: (...a: unknown[]) => replaceCharacterSpecializations(...a),
    listClassesWithSpecializations: (...a: unknown[]) => listClassesWithSpecializations(...a),
  },
}));

const PALADIN = {
  id: 2,
  name: 'paladin',
  specializations: [
    { id: 65, name: 'Holy', classId: 2, role: 'healer', icon: 'holy.jpg' },
    { id: 66, name: 'Protection', classId: 2, role: 'tank', icon: null },
    { id: 70, name: 'Retribution', classId: 2, role: 'melee', icon: null },
  ],
};

/** Givre, spé de mage : hors de la classe du paladin. */
const MAGE_FROST = 64;

const ARTHAS = {
  id: 5,
  name: 'Arthas',
  class: 'paladin',
  realmId: 1,
  spec: 'Retribution',
  specializationId: 70,
};

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue(ARTHAS);
  findClassWithSpecializations.mockReset().mockResolvedValue(PALADIN);
  listOffSpecializationIds.mockReset().mockResolvedValue([]);
  listSimmedSpecializationIds.mockReset().mockResolvedValue([]);
  replaceCharacterSpecializations.mockReset().mockResolvedValue(undefined);
  listClassesWithSpecializations.mockReset().mockResolvedValue([PALADIN]);
});

describe('buildCharacterSpecializations', () => {
  it('flags the primary spec, the off-specs and the specs with sim data', () => {
    const result = buildCharacterSpecializations(ARTHAS, PALADIN, [65], [70, 65]);
    expect(result).toEqual({
      characterId: 5,
      className: 'paladin',
      primarySpecializationId: 70,
      offSpecializationIds: [65],
      specializations: [
        {
          id: 65,
          name: 'Holy',
          role: 'healer',
          icon: 'holy.jpg',
          isPrimary: false,
          isOffSpec: true,
          hasSimData: true,
        },
        {
          id: 66,
          name: 'Protection',
          role: 'tank',
          icon: null,
          isPrimary: false,
          isOffSpec: false,
          hasSimData: false,
        },
        {
          id: 70,
          name: 'Retribution',
          role: 'melee',
          icon: null,
          isPrimary: true,
          isOffSpec: false,
          hasSimData: true,
        },
      ],
    });
  });

  it('drops an off-spec that became the primary spec or that belongs to another class', () => {
    const result = buildCharacterSpecializations(ARTHAS, PALADIN, [70, MAGE_FROST, 66], []);
    expect(result.offSpecializationIds).toEqual([66]);
    expect(result.specializations.find((s) => s.id === 70)).toMatchObject({
      isPrimary: true,
      isOffSpec: false,
    });
  });

  it('ignores a primary spec of another class (left over by a class change)', () => {
    const result = buildCharacterSpecializations(
      { ...ARTHAS, specializationId: MAGE_FROST },
      PALADIN,
      [],
      [],
    );
    expect(result.primarySpecializationId).toBeNull();
    expect(result.specializations.every((s) => !s.isPrimary)).toBe(true);
  });
});

describe('getCharacterSpecializations', () => {
  it('reads the off-specs and the simmed specs of the character', async () => {
    listOffSpecializationIds.mockResolvedValueOnce([66]);
    listSimmedSpecializationIds.mockResolvedValueOnce([70]);
    const result = await getCharacterSpecializations(5, 1);
    expect(findClassWithSpecializations).toHaveBeenCalledWith('paladin');
    expect(listOffSpecializationIds).toHaveBeenCalledWith(5);
    expect(listSimmedSpecializationIds).toHaveBeenCalledWith(5);
    expect(result).toMatchObject({ primarySpecializationId: 70, offSpecializationIds: [66] });
  });
});

describe.each([
  ['getCharacterSpecializations', () => getCharacterSpecializations(5, 1)],
  [
    'updateCharacterSpecializations',
    () => updateCharacterSpecializations(5, 1, { offSpecializationIds: [65] }),
  ],
])('%s and the checked realm', (_name, run) => {
  it('refuses a character that does not exist', async () => {
    findCharacterById.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
  });

  it('refuses a character of another realm', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, realmId: 2 });
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });

  it('refuses a character without realm, let through by checkPermission', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, realmId: null });
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
    expect(listOffSpecializationIds).not.toHaveBeenCalled();
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });
});

describe('updateCharacterSpecializations', () => {
  it('writes the new primary spec (name and id) and replaces the off-specs', async () => {
    await updateCharacterSpecializations(5, 1, {
      specializationId: 65,
      offSpecializationIds: [70, 66],
    });
    expect(replaceCharacterSpecializations).toHaveBeenCalledWith(5, {
      primary: { spec: 'Holy', specializationId: 65 },
      offSpecializationIds: [70, 66],
    });
  });

  it('keeps the primary spec when none is given', async () => {
    await updateCharacterSpecializations(5, 1, { offSpecializationIds: [65] });
    expect(replaceCharacterSpecializations).toHaveBeenCalledWith(5, {
      offSpecializationIds: [65],
    });
  });

  it('accepts an empty off-spec list, which removes them all', async () => {
    await updateCharacterSpecializations(5, 1, { offSpecializationIds: [] });
    expect(replaceCharacterSpecializations).toHaveBeenCalledWith(5, { offSpecializationIds: [] });
  });

  it('returns the specializations as written', async () => {
    listOffSpecializationIds.mockResolvedValueOnce([70]);
    const result = await updateCharacterSpecializations(5, 1, {
      specializationId: 65,
      offSpecializationIds: [70],
    });
    expect(result).toMatchObject({ primarySpecializationId: 65, offSpecializationIds: [70] });
  });

  it('refuses (400) a primary spec of another class, without writing', async () => {
    await expect(
      updateCharacterSpecializations(5, 1, {
        specializationId: MAGE_FROST,
        offSpecializationIds: [],
      }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_specialization' });
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });

  it('refuses (400) an off-spec of another class, without writing', async () => {
    await expect(
      updateCharacterSpecializations(5, 1, { offSpecializationIds: [65, MAGE_FROST] }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_specialization' });
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });

  it('refuses (400) the new primary spec listed as off-spec', async () => {
    await expect(
      updateCharacterSpecializations(5, 1, { specializationId: 65, offSpecializationIds: [65] }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'offspec_is_primary' });
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });

  it('refuses (400) the current primary spec listed as off-spec', async () => {
    await expect(
      updateCharacterSpecializations(5, 1, { offSpecializationIds: [70] }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'offspec_is_primary' });
    expect(replaceCharacterSpecializations).not.toHaveBeenCalled();
  });

  it('lets the current primary spec become an off-spec when the primary changes', async () => {
    await updateCharacterSpecializations(5, 1, {
      specializationId: 66,
      offSpecializationIds: [70],
    });
    expect(replaceCharacterSpecializations).toHaveBeenCalledWith(5, {
      primary: { spec: 'Protection', specializationId: 66 },
      offSpecializationIds: [70],
    });
  });

  it('accepts off-specs for a character without primary spec', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, spec: null, specializationId: null });
    await updateCharacterSpecializations(5, 1, { offSpecializationIds: [65, 70] });
    expect(replaceCharacterSpecializations).toHaveBeenCalledWith(5, {
      offSpecializationIds: [65, 70],
    });
  });
});

describe('listClassSpecializations', () => {
  it('serves the classes and their specs read from the database', async () => {
    await expect(listClassSpecializations()).resolves.toEqual([PALADIN]);
    expect(listClassesWithSpecializations).toHaveBeenCalledTimes(1);
  });

  // SIMS-027 : spés de WoW Forever, lignes Retail réutilisées avec leur libellé.
  const ROGUE = {
    id: 4,
    name: 'rogue',
    specializations: [
      { id: 259, name: 'Assassination', classId: 4, role: 'melee', icon: null },
      { id: 260, name: 'Outlaw', classId: 4, role: 'melee', icon: null },
      { id: 261, name: 'Subtlety', classId: 4, role: 'melee', icon: null },
    ],
  };
  const DRUID = {
    id: 11,
    name: 'druid',
    specializations: [
      { id: 102, name: 'Balance', classId: 11, role: 'ranged', icon: null },
      { id: 103, name: 'Feral', classId: 11, role: 'melee', icon: null },
      { id: 104, name: 'Guardian', classId: 11, role: 'tank', icon: null },
      { id: 105, name: 'Restoration', classId: 11, role: 'healer', icon: null },
    ],
  };
  const EVOKER = {
    id: 13,
    name: 'evoker',
    specializations: [{ id: 1467, name: 'Devastation', classId: 13, role: 'ranged', icon: null }],
  };

  it('serves forever classes only, with their forever labels', async () => {
    listClassesWithSpecializations.mockResolvedValue([DRUID, EVOKER, ROGUE]);
    const result = await listClassSpecializations('forever');

    expect(result.map((c) => c.name)).toEqual(['druid', 'rogue']);
    expect(result[0].specializations.map((s) => [s.id, s.name, s.label])).toEqual([
      [102, 'Balance', 'Balance'],
      [103, 'Feral', 'Feral Combat (cat)'],
      [104, 'Guardian', 'Feral Combat (bear)'],
      [105, 'Restoration', 'Restoration'],
    ]);
    expect(result[1].specializations.map((s) => s.label)).toEqual([
      'Assassination',
      'Combat',
      'Subtlety',
    ]);
  });

  it('labels every retail spec with its own name', async () => {
    listClassesWithSpecializations.mockResolvedValue([EVOKER, ROGUE]);
    const result = await listClassSpecializations('retail');
    expect(result.map((c) => c.name)).toEqual(['evoker', 'rogue']);
    expect(result[1].specializations.map((s) => s.label)).toEqual([
      'Assassination',
      'Outlaw',
      'Subtlety',
    ]);
  });

  it('leaves the list untouched without a game', async () => {
    listClassesWithSpecializations.mockResolvedValue([EVOKER, ROGUE]);
    const result = await listClassSpecializations();
    expect(result).toEqual([EVOKER, ROGUE]);
    expect(result[1].specializations[1]).not.toHaveProperty('label');
  });
});
