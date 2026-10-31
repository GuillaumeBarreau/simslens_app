// Spé lue chez Blizzard : remplie seulement si vide, inconnue → null et un log,
// jamais d'erreur (SIMS-208).
import {
  fillSpecializationFromBlizzard,
  findBlizzardSpecialization,
  isSpecializationEmpty,
} from '../blizzardSpecialization';

const findClassWithSpecializations = vi.fn();
const fillSpecializationIfEmpty = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    fillSpecializationIfEmpty: (...a: unknown[]) => fillSpecializationIfEmpty(...a),
  },
}));

const HUNTER = {
  id: 3,
  name: 'hunter',
  specializations: [
    { id: 253, name: 'Beast Mastery', classId: 3, role: 'dps' },
    { id: 254, name: 'Marksmanship', classId: 3, role: 'dps' },
  ],
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  findClassWithSpecializations
    .mockReset()
    .mockImplementation(async (name: string) => (name === 'hunter' ? HUNTER : null));
  fillSpecializationIfEmpty.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('isSpecializationEmpty', () => {
  it('treats null, empty and the legacy dps literal as empty', () => {
    expect(isSpecializationEmpty({ spec: null, specializationId: null })).toBe(true);
    expect(isSpecializationEmpty({})).toBe(true);
    expect(isSpecializationEmpty({ spec: '  ', specializationId: null })).toBe(true);
    expect(isSpecializationEmpty({ spec: 'dps', specializationId: null })).toBe(true);
    expect(isSpecializationEmpty({ spec: 'DPS' })).toBe(true);
  });

  it('keeps a chosen spec, with or without specializationId', () => {
    expect(isSpecializationEmpty({ spec: 'Frost', specializationId: 251 })).toBe(false);
    expect(isSpecializationEmpty({ spec: null, specializationId: 251 })).toBe(false);
    expect(isSpecializationEmpty({ spec: 'Frost', specializationId: null })).toBe(false);
  });
});

describe('findBlizzardSpecialization', () => {
  it('finds the English active spec in the class of the character', async () => {
    await expect(findBlizzardSpecialization('Hunter', 'Beast Mastery')).resolves.toMatchObject({
      id: 253,
      name: 'Beast Mastery',
    });
  });

  it('returns null without reading the database when Blizzard gives no spec', async () => {
    await expect(findBlizzardSpecialization('hunter', undefined)).resolves.toBeNull();
    await expect(findBlizzardSpecialization('hunter', ' ')).resolves.toBeNull();
    expect(findClassWithSpecializations).not.toHaveBeenCalled();
  });

  it('returns null and logs an unknown spec or class, without throwing', async () => {
    await expect(findBlizzardSpecialization('hunter', 'Maîtrise des bêtes')).resolves.toBeNull();
    await expect(findBlizzardSpecialization('bard', 'Beast Mastery')).resolves.toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});

describe('fillSpecializationFromBlizzard', () => {
  it('writes the canonical name and id through the conditional update', async () => {
    await expect(fillSpecializationFromBlizzard(5, 'hunter', 'beast mastery')).resolves.toBe(true);
    expect(fillSpecializationIfEmpty).toHaveBeenCalledWith(5, {
      spec: 'Beast Mastery',
      specializationId: 253,
    });
  });

  it('writes nothing for an unknown spec, never a dps placeholder', async () => {
    await expect(fillSpecializationFromBlizzard(5, 'hunter', 'Fury')).resolves.toBe(false);
    expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
  });

  it('logs a database failure instead of throwing', async () => {
    fillSpecializationIfEmpty.mockRejectedValueOnce(new Error('db down'));
    await expect(fillSpecializationFromBlizzard(5, 'hunter', 'Marksmanship')).resolves.toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
