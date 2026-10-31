// Usecases qui écrivent sur un personnage désigné par la route : rattachement
// au royaume vérifié par checkPermission, y compris pour un personnage sans
// royaume que le middleware laisse passer (SIMS-161).

import { CharacterAlreadyExistsError, CharacterNotFoundError } from '../character.errors';
import { archiveCharacter } from '../usecases/archiveCharacter';
import { syncCharacterFromBlizzard } from '../usecases/syncCharacterFromBlizzard';
import { updateCharacter } from '../usecases/updateCharacter';

const findCharacterById = vi.fn();
const updateCharacterById = vi.fn();
const findCharacterIdByNameAndRealm = vi.fn();
const findClassWithSpecializations = vi.fn();
const syncUpgradesFromBlizzard = vi.fn();
const fillSpecializationIfEmpty = vi.fn();
const getCharacterProfile = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
    updateCharacterById: (...a: unknown[]) => updateCharacterById(...a),
    findCharacterIdByNameAndRealm: (...a: unknown[]) => findCharacterIdByNameAndRealm(...a),
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    fillSpecializationIfEmpty: (...a: unknown[]) => fillSpecializationIfEmpty(...a),
  },
}));
vi.mock('../../../data', () => ({ prisma: { tag: 'prisma' } }));
vi.mock('../../../services/blizzardSync.service', () => ({
  syncUpgradesFromBlizzard: (...a: unknown[]) => syncUpgradesFromBlizzard(...a),
}));
vi.mock('../../../integrations/blizzard/api', () => ({
  getCharacterProfile: (...a: unknown[]) => getCharacterProfile(...a),
}));

const ARTHAS = {
  id: 5,
  name: 'Arthas',
  realm: 'hyjal',
  region: 'EU',
  class: 'paladin',
  realmId: 1,
};

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue(ARTHAS);
  updateCharacterById.mockReset().mockResolvedValue({ changes: 1, lastID: 5 });
  findCharacterIdByNameAndRealm.mockReset().mockResolvedValue(null);
  findClassWithSpecializations.mockReset().mockResolvedValue(null);
  syncUpgradesFromBlizzard.mockReset().mockResolvedValue({ updated: 3, skipped: 1 });
  fillSpecializationIfEmpty.mockReset().mockResolvedValue(true);
  getCharacterProfile.mockReset().mockResolvedValue({ active_spec: { name: 'Retribution' } });
});

describe.each([
  ['archiveCharacter', () => archiveCharacter(5, 1)],
  ['updateCharacter', () => updateCharacter(5, 1, { name: 'Uther' })],
  ['syncCharacterFromBlizzard', () => syncCharacterFromBlizzard(5, 1)],
])('%s', (_name, run) => {
  it('refuses a character that does not exist', async () => {
    findCharacterById.mockResolvedValueOnce(null);
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
  });

  it('refuses a character of another realm', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, realmId: 2 });
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
  });

  it('refuses a character without realm, let through by checkPermission', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, realmId: null });
    await expect(run()).rejects.toBeInstanceOf(CharacterNotFoundError);
    expect(updateCharacterById).not.toHaveBeenCalled();
    expect(syncUpgradesFromBlizzard).not.toHaveBeenCalled();
  });
});

describe('archiveCharacter', () => {
  it('unlinks the character from the roster', async () => {
    const result = await archiveCharacter(5, 1);
    expect(updateCharacterById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ realmId: null, archived: 1, archivedAt: expect.any(Date) }),
    );
    expect(result).toEqual({ id: 5, message: 'Arthas a été retiré du roster' });
  });
});

describe('updateCharacter', () => {
  it('updates the given fields and returns the fresh character', async () => {
    findCharacterById.mockResolvedValueOnce(ARTHAS).mockResolvedValueOnce({
      ...ARTHAS,
      name: 'Uther',
    });
    const result = await updateCharacter(5, 1, { name: 'Uther', status: 'approved' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, { name: 'Uther', status: 'approved' });
    expect(result).toMatchObject({ name: 'Uther', message: 'Uther a été mis à jour' });
  });

  it('refuses a name already taken on the same server', async () => {
    findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 9, realmId: 1 });
    await expect(updateCharacter(5, 1, { name: 'Uther' })).rejects.toBeInstanceOf(
      CharacterAlreadyExistsError,
    );
    expect(updateCharacterById).not.toHaveBeenCalled();
  });
});

describe('syncCharacterFromBlizzard', () => {
  it('syncs the gear of a character of the realm', async () => {
    const result = await syncCharacterFromBlizzard(5, 1);
    expect(syncUpgradesFromBlizzard).toHaveBeenCalledWith({ tag: 'prisma' }, 5);
    expect(result).toEqual({
      message: 'Synchronisation réussie pour Arthas',
      character: { id: 5, name: 'Arthas', realm: 'hyjal', region: 'EU' },
      result: { updated: 3, skipped: 1 },
    });
  });

  describe('specialization (SIMS-208)', () => {
    const PALADIN = {
      id: 2,
      name: 'paladin',
      specializations: [
        { id: 65, name: 'Holy', classId: 2, role: 'healer' },
        { id: 70, name: 'Retribution', classId: 2, role: 'dps' },
      ],
    };

    beforeEach(() => {
      findClassWithSpecializations.mockResolvedValue(PALADIN);
    });

    it('fills an empty spec from the Blizzard profile', async () => {
      findCharacterById.mockResolvedValueOnce({ ...ARTHAS, spec: 'dps', specializationId: null });
      await syncCharacterFromBlizzard(5, 1);
      expect(getCharacterProfile).toHaveBeenCalledWith('EU', 'hyjal', 'Arthas');
      expect(fillSpecializationIfEmpty).toHaveBeenCalledWith(5, {
        spec: 'Retribution',
        specializationId: 70,
      });
    });

    it('does not even read the profile of a character with a spec chosen by hand', async () => {
      findCharacterById.mockResolvedValueOnce({ ...ARTHAS, spec: 'Holy', specializationId: 65 });
      await syncCharacterFromBlizzard(5, 1);
      expect(getCharacterProfile).not.toHaveBeenCalled();
      expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
    });

    it('still syncs the gear when the profile cannot be read', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      getCharacterProfile.mockRejectedValueOnce(new Error('Blizzard down'));
      const result = await syncCharacterFromBlizzard(5, 1);
      expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
      expect(result.result).toEqual({ updated: 3, skipped: 1 });
    });
  });
});

describe('updateCharacter in self-edit (SIMS-196)', () => {
  it('refuses that a player changes the status of his own character, before reading or writing', async () => {
    await expect(
      updateCharacter(5, 1, { status: 'approved' }, { selfEdit: true }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'officer_only_field' });
    expect(findCharacterById).not.toHaveBeenCalled();
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it.each([
    ['name', { name: 'Uther' }],
    ['realm', { realm: 'ysondre' }],
    ['region', { region: 'US' }],
    ['class', { class: 'warrior' }],
  ])(
    'refuses that a player changes the %s of his own character, without writing',
    async (_field, input) => {
      await expect(updateCharacter(5, 1, input, { selfEdit: true })).rejects.toMatchObject({
        statusCode: 403,
        code: 'officer_only_field',
      });
      expect(updateCharacterById).not.toHaveBeenCalled();
    },
  );

  it('accepts the whole roster form sent back unchanged, whatever the case', async () => {
    await updateCharacter(
      5,
      1,
      { name: 'ARTHAS', realm: 'Hyjal', region: 'eu', discordTag: 'arthas#1' },
      { selfEdit: true },
    );
    expect(updateCharacterById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ discordTag: 'arthas#1' }),
    );
  });

  it('accepts the default region of the form when the character has none', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, region: null });
    await updateCharacter(5, 1, { region: 'EU' }, { selfEdit: true });
    expect(updateCharacterById).toHaveBeenCalled();
  });

  it('lets an officer rename a character', async () => {
    await updateCharacter(5, 1, { name: 'Uther' });
    expect(updateCharacterById).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Uther' }));
  });

  it('lets an officer change the status', async () => {
    await updateCharacter(5, 1, { status: 'approved' });
    expect(updateCharacterById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ status: 'approved' }),
    );
  });
});
