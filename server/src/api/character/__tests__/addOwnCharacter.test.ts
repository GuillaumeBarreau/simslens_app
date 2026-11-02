// Personnage WoW Forever saisi par son joueur (SIMS-050) : guilde Forever seulement,
// classes et spés du registre Forever, nom libre mais contrôlé, unicité par serveur.

import {
  CharacterAlreadyExistsError,
  CharacterValidationError,
  GameCapabilityUnavailableError,
  InvalidSpecializationError,
  OffSpecIsPrimaryError,
  UnknownCharacterClassError,
} from '../character.errors';
import {
  addOwnCharacter,
  isValidOwnCharacterName,
  normalizeOwnCharacterName,
} from '../usecases/addOwnCharacter';

const getRealmById = vi.fn();
const findClassWithSpecializations = vi.fn();
const findCharacterIdByNameAndRealm = vi.fn();
const createCharacterWithOffSpecs = vi.fn();
const findCharacterById = vi.fn();

vi.mock('../../realm/realm.repository', () => ({
  default: {
    getRealmById: (...a: unknown[]) => getRealmById(...a),
  },
}));

vi.mock('../character.repository', () => ({
  default: {
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    findCharacterIdByNameAndRealm: (...a: unknown[]) => findCharacterIdByNameAndRealm(...a),
    createCharacterWithOffSpecs: (...a: unknown[]) => createCharacterWithOffSpecs(...a),
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
  },
}));

const FOREVER_GUILD = { id: 7, server: 'forever-pve', region: 'eu', game: 'forever' };
const RETAIL_GUILD = { id: 3, server: 'hyjal', region: 'EU', game: 'retail' };

const ROGUE = {
  id: 4,
  name: 'rogue',
  specializations: [
    { id: 259, name: 'Assassination', classId: 4, role: 'melee', icon: null },
    { id: 260, name: 'Outlaw', classId: 4, role: 'melee', icon: null },
    { id: 261, name: 'Subtlety', classId: 4, role: 'melee', icon: null },
  ],
};

/** Druide avec une spé en base (999) que WoW Forever ne propose pas. */
const DRUID = {
  id: 11,
  name: 'druid',
  specializations: [
    { id: 102, name: 'Balance', classId: 11, role: 'ranged', icon: null },
    { id: 103, name: 'Feral', classId: 11, role: 'melee', icon: null },
    { id: 104, name: 'Guardian', classId: 11, role: 'tank', icon: null },
    { id: 105, name: 'Restoration', classId: 11, role: 'healer', icon: null },
    { id: 999, name: 'Wildstalker', classId: 11, role: 'melee', icon: null },
  ],
};

const MAGE_FROST = 64;

beforeEach(() => {
  getRealmById.mockReset().mockResolvedValue(FOREVER_GUILD);
  findClassWithSpecializations
    .mockReset()
    .mockImplementation(async (name: string) =>
      name === 'rogue' ? ROGUE : name === 'druid' ? DRUID : null,
    );
  findCharacterIdByNameAndRealm.mockReset().mockResolvedValue(null);
  createCharacterWithOffSpecs.mockReset().mockResolvedValue(42);
  findCharacterById
    .mockReset()
    .mockImplementation(async (id: number) => ({ id, name: 'Jean-Luc Picard' }));
});

describe('addOwnCharacter', () => {
  it('creates the player character in a Forever guild, approved and owned by the user', async () => {
    const result = await addOwnCharacter(7, 'user-1', {
      name: '  Jean-Luc   Picard ',
      class: 'Rogue',
      specializationId: 260,
      offSpecializationIds: [261, 261],
    });

    expect(createCharacterWithOffSpecs).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jean-Luc Picard',
        class: 'rogue',
        realm: 'forever-pve',
        region: 'EU',
        realmId: 7,
        userId: 'user-1',
        status: 'approved',
        spec: 'Outlaw',
        specializationId: 260,
      }),
      [261],
    );
    expect(findCharacterIdByNameAndRealm).toHaveBeenCalledWith('Jean-Luc Picard', 'forever-pve');
    expect(result).toMatchObject({ id: 42, message: expect.stringContaining('Jean-Luc Picard') });
  });

  it('accepts a character without specialization', async () => {
    await addOwnCharacter(7, 'user-1', { name: "Ana d'Arc", class: 'rogue' });
    expect(createCharacterWithOffSpecs).toHaveBeenCalledWith(
      expect.objectContaining({ spec: null, specializationId: null }),
      [],
    );
  });

  it('refuses a Retail guild (Battle.net claim) with 409', async () => {
    getRealmById.mockResolvedValue(RETAIL_GUILD);
    const call = addOwnCharacter(3, 'user-1', { name: 'Thrall', class: 'rogue' });
    await expect(call).rejects.toBeInstanceOf(GameCapabilityUnavailableError);
    await expect(call).rejects.toMatchObject({
      statusCode: 409,
      code: 'game_capability_unavailable',
    });
    expect(createCharacterWithOffSpecs).not.toHaveBeenCalled();
  });

  it('refuses an unknown guild like a Retail one', async () => {
    getRealmById.mockResolvedValue(null);
    await expect(
      addOwnCharacter(99, 'user-1', { name: 'Thrall', class: 'rogue' }),
    ).rejects.toBeInstanceOf(GameCapabilityUnavailableError);
  });

  it('refuses a class that WoW Forever does not have', async () => {
    await expect(
      addOwnCharacter(7, 'user-1', { name: 'Thrall', class: 'death_knight' }),
    ).rejects.toBeInstanceOf(UnknownCharacterClassError);
    await expect(
      addOwnCharacter(7, 'user-1', { name: 'Thrall', class: 'tinker' }),
    ).rejects.toBeInstanceOf(UnknownCharacterClassError);
    expect(findClassWithSpecializations).not.toHaveBeenCalled();
  });

  it('refuses a specialization of another class', async () => {
    await expect(
      addOwnCharacter(7, 'user-1', {
        name: 'Thrall',
        class: 'rogue',
        specializationId: MAGE_FROST,
      }),
    ).rejects.toBeInstanceOf(InvalidSpecializationError);
  });

  it('refuses a specialization of the class that WoW Forever does not offer', async () => {
    await expect(
      addOwnCharacter(7, 'user-1', { name: 'Thrall', class: 'druid', specializationId: 999 }),
    ).rejects.toBeInstanceOf(InvalidSpecializationError);
    await expect(
      addOwnCharacter(7, 'user-1', {
        name: 'Thrall',
        class: 'druid',
        offSpecializationIds: [999],
      }),
    ).rejects.toBeInstanceOf(InvalidSpecializationError);
  });

  it('refuses a primary specialization also listed as off-spec', async () => {
    await expect(
      addOwnCharacter(7, 'user-1', {
        name: 'Thrall',
        class: 'rogue',
        specializationId: 259,
        offSpecializationIds: [259],
      }),
    ).rejects.toBeInstanceOf(OffSpecIsPrimaryError);
  });

  it('refuses a name already taken on the guild server with 409', async () => {
    findCharacterIdByNameAndRealm.mockResolvedValue({ id: 5, realmId: 8 });
    const call = addOwnCharacter(7, 'user-1', { name: 'Thrall', class: 'rogue' });
    await expect(call).rejects.toBeInstanceOf(CharacterAlreadyExistsError);
    await expect(call).rejects.toMatchObject({ statusCode: 409 });
    expect(createCharacterWithOffSpecs).not.toHaveBeenCalled();
  });

  it('turns a concurrent duplicate (unique constraint) into a 409', async () => {
    createCharacterWithOffSpecs.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    await expect(
      addOwnCharacter(7, 'user-1', { name: 'Thrall', class: 'rogue' }),
    ).rejects.toBeInstanceOf(CharacterAlreadyExistsError);
  });

  it.each(['T', 'Thrall42', '-Thrall', "Thr''all", 'Thrall_Son', 'a'.repeat(41)])(
    'refuses the invalid name %j',
    async (name) => {
      await expect(addOwnCharacter(7, 'user-1', { name, class: 'rogue' })).rejects.toBeInstanceOf(
        CharacterValidationError,
      );
      expect(createCharacterWithOffSpecs).not.toHaveBeenCalled();
    },
  );
});

describe('own character name', () => {
  it('collapses and trims spaces', () => {
    expect(normalizeOwnCharacterName('  Ana   de  Ville ')).toBe('Ana de Ville');
  });

  it.each(['Thrall', 'Jean-Luc Picard', "Ana d'Arc", 'Ana d’Arc', 'Élodie Brûlé', 'Ли Мэй'])(
    'accepts %j',
    (name) => {
      expect(isValidOwnCharacterName(name)).toBe(true);
    },
  );

  it.each(['T', 'Thrall42', '-Thrall', 'Thrall-', 'Ana  Arc', 'Thrall_Son', 'a'.repeat(41)])(
    'refuses %j',
    (name) => {
      expect(isValidOwnCharacterName(name)).toBe(false);
    },
  );
});
