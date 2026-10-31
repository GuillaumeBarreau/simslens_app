// Création et édition d'un personnage : classe normalisée, spé validée dans sa
// classe, spec et specializationId écrits ensemble (SIMS-213).

import { InvalidSpecializationError, UnknownCharacterClassError } from '../character.errors';
import { createCharacter } from '../usecases/createCharacter';
import { updateCharacter } from '../usecases/updateCharacter';

const findCharacterById = vi.fn();
const updateCharacterById = vi.fn();
const findCharacterIdByNameAndRealm = vi.fn();
const findClassWithSpecializations = vi.fn();
const createCharacterRow = vi.fn();
const getCharacterEnrichedData = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
    updateCharacterById: (...a: unknown[]) => updateCharacterById(...a),
    findCharacterIdByNameAndRealm: (...a: unknown[]) => findCharacterIdByNameAndRealm(...a),
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    createCharacter: (...a: unknown[]) => createCharacterRow(...a),
  },
}));
vi.mock('../../../integrations/blizzard/api', () => ({
  getCharacterEnrichedData: (...a: unknown[]) => getCharacterEnrichedData(...a),
}));

const spec = (id: number, name: string, classId: number) => ({ id, name, classId, role: 'dps' });

const CLASSES = {
  death_knight: {
    id: 6,
    name: 'death_knight',
    specializations: [spec(16, 'Blood', 6), spec(17, 'Frost', 6), spec(18, 'Unholy', 6)],
  },
  paladin: {
    id: 2,
    name: 'paladin',
    specializations: [spec(4, 'Holy', 2), spec(5, 'Protection', 2), spec(6, 'Retribution', 2)],
  },
  warrior: {
    id: 1,
    name: 'warrior',
    specializations: [spec(1, 'Arms', 1), spec(2, 'Fury', 1), spec(3, 'Protection', 1)],
  },
};

const ARTHAS = {
  id: 5,
  name: 'Arthas',
  realm: 'hyjal',
  region: 'EU',
  class: 'paladin',
  spec: 'Retribution',
  specializationId: 6,
  specialization: CLASSES.paladin.specializations[2],
  realmId: 1,
};

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue(ARTHAS);
  updateCharacterById.mockReset().mockResolvedValue({ changes: 1, lastID: 5 });
  findCharacterIdByNameAndRealm.mockReset().mockResolvedValue(null);
  findClassWithSpecializations
    .mockReset()
    .mockImplementation(async (name: string) => CLASSES[name as keyof typeof CLASSES] ?? null);
  createCharacterRow.mockReset().mockResolvedValue(42);
  getCharacterEnrichedData.mockReset().mockResolvedValue({
    currentPeriodKeyCount: 0,
    ilvl: 0,
    score: 0,
    ManaforgeBuff: '0',
    thumbnail: null,
  });
});

describe('createCharacter', () => {
  const base = { name: 'Arthas', realm: 'hyjal', region: 'EU' };

  it('normalizes the class and writes spec and specializationId together', async () => {
    const result = await createCharacter({ ...base, class: 'Death Knight', spec: 'frost' });
    expect(createCharacterRow).toHaveBeenCalledWith(
      expect.objectContaining({ class: 'death_knight', spec: 'Frost', specializationId: 17 }),
    );
    expect(result).toMatchObject({ id: 42, class: 'death_knight', spec: 'Frost' });
  });

  it('accepts a specializationId of the class', async () => {
    await createCharacter({ ...base, class: 'warrior', specializationId: 2 });
    expect(createCharacterRow).toHaveBeenCalledWith(
      expect.objectContaining({ class: 'warrior', spec: 'Fury', specializationId: 2 }),
    );
  });

  it('writes no spec as null, not an empty string', async () => {
    await createCharacter({ ...base, class: 'warrior' });
    expect(createCharacterRow).toHaveBeenCalledWith(
      expect.objectContaining({ spec: null, specializationId: null }),
    );
  });

  it.each([
    ['a spec of another class', { class: 'warrior', spec: 'Holy' }],
    ['a localized name', { class: 'warrior', spec: 'Fureur' }],
    ['an unknown spec', { class: 'warrior', spec: 'Gladiator' }],
    ['an id of another class', { class: 'warrior', specializationId: 17 }],
  ])('refuses %s before calling Blizzard or writing', async (_label, fields) => {
    await expect(createCharacter({ ...base, ...fields })).rejects.toBeInstanceOf(
      InvalidSpecializationError,
    );
    expect(getCharacterEnrichedData).not.toHaveBeenCalled();
    expect(createCharacterRow).not.toHaveBeenCalled();
  });

  it('refuses an unknown class with a 400 instead of a foreign key error', async () => {
    await expect(
      createCharacter({ ...base, class: 'Chevalier de la mort', spec: 'Frost' }),
    ).rejects.toBeInstanceOf(UnknownCharacterClassError);
    expect(createCharacterRow).not.toHaveBeenCalled();
  });
});

describe('updateCharacter', () => {
  it('does not look up the class when neither class nor spec change', async () => {
    await updateCharacter(5, 1, { name: 'Uther' });
    expect(findClassWithSpecializations).not.toHaveBeenCalled();
    expect(updateCharacterById).toHaveBeenCalledWith(5, { name: 'Uther' });
  });

  it('resolves the spec in the current class, by name whatever the case', async () => {
    await updateCharacter(5, 1, { spec: 'holy' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, { spec: 'Holy', specializationId: 4 });
  });

  it('resolves the spec by id', async () => {
    await updateCharacter(5, 1, { specializationId: 5 });
    expect(updateCharacterById).toHaveBeenCalledWith(5, {
      spec: 'Protection',
      specializationId: 5,
    });
  });

  it('writes the new class with a spec of that class, as the roster drawer sends them', async () => {
    await updateCharacter(5, 1, { class: 'Death Knight', spec: 'Blood' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, {
      class: 'death_knight',
      spec: 'Blood',
      specializationId: 16,
    });
  });

  it('refuses a spec that does not belong to the current class', async () => {
    await expect(updateCharacter(5, 1, { spec: 'Fury' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_specialization',
    });
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('refuses a spec of the old class when the class changes', async () => {
    await expect(
      updateCharacter(5, 1, { class: 'warrior', spec: 'Retribution' }),
    ).rejects.toBeInstanceOf(InvalidSpecializationError);
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('refuses a class change without a spec valid for the new class', async () => {
    await expect(updateCharacter(5, 1, { class: 'warrior' })).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_specialization',
      message: expect.stringContaining('indiquer une spécialisation de la nouvelle classe'),
    });
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('keeps the current spec by name when it exists in the new class', async () => {
    findCharacterById.mockResolvedValue({
      ...ARTHAS,
      spec: 'Protection',
      specializationId: 5,
      specialization: CLASSES.paladin.specializations[1],
    });
    await updateCharacter(5, 1, { class: 'warrior' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, {
      class: 'warrior',
      spec: 'Protection',
      specializationId: 3,
    });
  });

  it('changes the class of a character without spec', async () => {
    findCharacterById.mockResolvedValue({
      ...ARTHAS,
      spec: '',
      specializationId: null,
      specialization: null,
    });
    await updateCharacter(5, 1, { class: 'warrior' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, {
      class: 'warrior',
      spec: null,
      specializationId: null,
    });
  });

  it('refuses an unknown class', async () => {
    await expect(updateCharacter(5, 1, { class: 'Barde', spec: 'Fury' })).rejects.toBeInstanceOf(
      UnknownCharacterClassError,
    );
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('applies the same checks in self-edit', async () => {
    await expect(
      updateCharacter(5, 1, { spec: 'Fury' }, { selfEdit: true }),
    ).rejects.toBeInstanceOf(InvalidSpecializationError);
    await updateCharacter(5, 1, { spec: 'Holy' }, { selfEdit: true });
    expect(updateCharacterById).toHaveBeenCalledWith(5, { spec: 'Holy', specializationId: 4 });
  });
});
