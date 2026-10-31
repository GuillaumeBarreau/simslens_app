// Classe et spé d'un personnage (SIMS-213) : normalisation de la classe, spé
// retrouvée par nom ou par identifiant dans cette classe, erreurs 400 typées.

import { InvalidSpecializationError, UnknownCharacterClassError } from '../character.errors';
import {
  findSpecializationInClass,
  resolveCharacterClass,
  resolveSpecialization,
} from '../resolveSpecialization';

const findClassWithSpecializations = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
  },
}));

const spec = (id: number, name: string, classId: number, role = 'dps') => ({
  id,
  name,
  classId,
  role,
});

const CLASSES = {
  death_knight: {
    id: 6,
    name: 'death_knight',
    specializations: [spec(16, 'Blood', 6, 'tank'), spec(17, 'Frost', 6), spec(18, 'Unholy', 6)],
  },
  hunter: {
    id: 3,
    name: 'hunter',
    specializations: [
      spec(7, 'Beast Mastery', 3),
      spec(8, 'Marksmanship', 3),
      spec(9, 'Survival', 3),
    ],
  },
  warrior: {
    id: 1,
    name: 'warrior',
    specializations: [spec(1, 'Arms', 1), spec(2, 'Fury', 1), spec(3, 'Protection', 1, 'tank')],
  },
};

beforeEach(() => {
  findClassWithSpecializations
    .mockReset()
    .mockImplementation(async (name: string) => CLASSES[name as keyof typeof CLASSES] ?? null);
});

describe('resolveCharacterClass', () => {
  it('normalizes the class before looking it up', async () => {
    const found = await resolveCharacterClass(' Death Knight ');
    expect(findClassWithSpecializations).toHaveBeenCalledWith('death_knight');
    expect(found.name).toBe('death_knight');
  });

  it.each(['Chevalier de la mort', 'paladinx'])(
    'refuses an unknown class %j with a 400',
    async (c) => {
      await expect(resolveCharacterClass(c)).rejects.toMatchObject({
        statusCode: 400,
        code: 'invalid_class',
      });
    },
  );

  it('refuses an empty class without querying the database', async () => {
    await expect(resolveCharacterClass('')).rejects.toBeInstanceOf(UnknownCharacterClassError);
    expect(findClassWithSpecializations).not.toHaveBeenCalled();
  });
});

describe('resolveSpecialization', () => {
  it('finds the spec by name, whatever the case', async () => {
    await expect(resolveSpecialization('Hunter', 'BEAST mastery')).resolves.toEqual({
      className: 'hunter',
      specialization: CLASSES.hunter.specializations[0],
    });
    await expect(resolveSpecialization('death_knight', ' frost ')).resolves.toMatchObject({
      className: 'death_knight',
      specialization: { id: 17, name: 'Frost' },
    });
  });

  it('finds the spec by id', async () => {
    await expect(resolveSpecialization('warrior', 3)).resolves.toMatchObject({
      specialization: { id: 3, name: 'Protection' },
    });
  });

  it('refuses a spec of another class, by name or by id', async () => {
    await expect(resolveSpecialization('warrior', 'Frost')).rejects.toBeInstanceOf(
      InvalidSpecializationError,
    );
    await expect(resolveSpecialization('warrior', 17)).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_specialization',
    });
  });

  it('refuses a localized name, with an explicit message', async () => {
    await expect(resolveSpecialization('warrior', 'Fureur')).rejects.toMatchObject({
      statusCode: 400,
      code: 'invalid_specialization',
      message: "La spécialisation « Fureur » n'existe pas pour la classe warrior",
    });
  });

  it('refuses an unknown spec and an unknown class', async () => {
    await expect(resolveSpecialization('warrior', 'Tank')).rejects.toBeInstanceOf(
      InvalidSpecializationError,
    );
    await expect(resolveSpecialization('Barde', 'Fury')).rejects.toBeInstanceOf(
      UnknownCharacterClassError,
    );
  });
});

describe('findSpecializationInClass', () => {
  it('returns null rather than throwing', () => {
    expect(findSpecializationInClass(CLASSES.warrior, 'Holy')).toBeNull();
    expect(findSpecializationInClass(CLASSES.warrior, '  ')).toBeNull();
    expect(findSpecializationInClass(CLASSES.warrior, 99)).toBeNull();
  });
});
