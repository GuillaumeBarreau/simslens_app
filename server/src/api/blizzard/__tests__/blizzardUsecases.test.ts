import { CharacterNotOwnedError, CharacterWithoutRealmError } from '../blizzard.errors';
import { claimCharacter } from '../usecases/claimCharacter';
import { importGuildMembers } from '../usecases/manageGuildRoster';

const listUserCharacters = vi.fn();
const getCharacterProfile = vi.fn();
const findCharacterIdByNameAndRealm = vi.fn();
const createCharacter = vi.fn();
const updateCharacterById = vi.fn();
const findRealmByNameAndRegion = vi.fn();
const getRealmUserRole = vi.fn();
const getGuestMembershipsByUserId = vi.fn();
const getCharacterEnrichedData = vi.fn();
const findClassWithSpecializations = vi.fn();
const fillSpecializationIfEmpty = vi.fn();

const DEATH_KNIGHT = {
  id: 6,
  name: 'death_knight',
  specializations: [
    { id: 250, name: 'Blood', classId: 6, role: 'tank' },
    { id: 251, name: 'Frost', classId: 6, role: 'dps' },
  ],
};

vi.mock('../blizzard.service', () => ({
  default: {
    listUserCharacters: (...a: unknown[]) => listUserCharacters(...a),
    getCharacterProfile: (...a: unknown[]) => getCharacterProfile(...a),
  },
}));
vi.mock('../../character/character.repository', () => ({
  default: {
    findCharacterIdByNameAndRealm: (...a: unknown[]) => findCharacterIdByNameAndRealm(...a),
    createCharacter: (...a: unknown[]) => createCharacter(...a),
    updateCharacterById: (...a: unknown[]) => updateCharacterById(...a),
    findClassWithSpecializations: (...a: unknown[]) => findClassWithSpecializations(...a),
    fillSpecializationIfEmpty: (...a: unknown[]) => fillSpecializationIfEmpty(...a),
  },
}));
vi.mock('../../realm/realm.repository', () => ({
  default: {
    findRealmByNameAndRegion: (...a: unknown[]) => findRealmByNameAndRegion(...a),
    getRealmUserRole: (...a: unknown[]) => getRealmUserRole(...a),
  },
}));
vi.mock('../../invite/invite.repository', () => ({
  default: {
    getGuestMembershipsByUserId: (...a: unknown[]) => getGuestMembershipsByUserId(...a),
  },
}));
vi.mock('../../../integrations/blizzard/api', () => ({
  getCharacterEnrichedData: (...a: unknown[]) => getCharacterEnrichedData(...a),
}));

const SESSION = { token: 't', userId: 'u1' };
const INPUT = { name: 'Arthas', realm: 'hyjal', region: 'eu' };

const bnetChar = (guild: string | null = 'Les Lumineux') => ({
  name: 'Arthas',
  realm: { slug: 'hyjal' },
  playable_class: { name: 'Death Knight' },
  guild: guild ? { name: guild } : null,
  average_item_level: 610,
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  listUserCharacters.mockReset().mockResolvedValue([bnetChar()]);
  getCharacterProfile.mockReset().mockResolvedValue(null);
  findCharacterIdByNameAndRealm.mockReset().mockResolvedValue(null);
  createCharacter.mockReset().mockResolvedValue(42);
  updateCharacterById.mockReset().mockResolvedValue(undefined);
  findRealmByNameAndRegion.mockReset().mockResolvedValue({ id: 3 });
  getRealmUserRole.mockReset().mockResolvedValue('member');
  getGuestMembershipsByUserId.mockReset().mockResolvedValue([]);
  getCharacterEnrichedData.mockReset().mockResolvedValue({
    currentPeriodKeyCount: 4,
    ilvl: 612,
    score: 2800,
    ManaforgeBuff: 6,
    thumbnail: 'eu/1/2-avatar.jpg',
    active_spec: 'Blood',
  });
  findClassWithSpecializations.mockReset().mockResolvedValue(DEATH_KNIGHT);
  fillSpecializationIfEmpty.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('claimCharacter', () => {
  it('refuses a character absent from the Battle.net account', async () => {
    listUserCharacters.mockResolvedValueOnce([]);
    await expect(claimCharacter(SESSION, INPUT)).rejects.toBeInstanceOf(CharacterNotOwnedError);
    expect(createCharacter).not.toHaveBeenCalled();
    expect(updateCharacterById).not.toHaveBeenCalled();
  });

  it('lists the Battle.net characters in the lower-case region, without enrichment', async () => {
    await claimCharacter(SESSION, INPUT);
    expect(listUserCharacters).toHaveBeenCalledWith('t', 'eu', false);
  });

  describe('unknown character', () => {
    it("creates it in its guild's realm, approved for a realm admin", async () => {
      getRealmUserRole.mockResolvedValueOnce('owner');
      const result = await claimCharacter(SESSION, INPUT);
      expect(result).toEqual({ success: true, created: true, realmId: 3, characterId: 42 });
      expect(createCharacter).toHaveBeenCalledWith(
        expect.objectContaining({
          class: 'death_knight',
          region: 'EU',
          realmId: 3,
          userId: 'u1',
          status: 'approved',
        }),
      );
    });

    it('looks the guild up in the full profile when the list has none', async () => {
      listUserCharacters.mockResolvedValueOnce([bnetChar(null)]);
      getCharacterProfile.mockResolvedValueOnce({ guild: { name: 'Les Lumineux' } });
      await claimCharacter(SESSION, INPUT);
      expect(findRealmByNameAndRegion).toHaveBeenCalledWith('Les Lumineux', 'EU');
      expect(createCharacter).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    it("falls back to the user's guest realm without a registered guild", async () => {
      findRealmByNameAndRegion.mockResolvedValueOnce(null);
      getGuestMembershipsByUserId.mockResolvedValueOnce([{ realmId: 8 }]);
      await claimCharacter(SESSION, INPUT);
      expect(createCharacter).toHaveBeenCalledWith(expect.objectContaining({ realmId: 8 }));
    });

    it('refuses a character without registered guild nor guest realm', async () => {
      findRealmByNameAndRegion.mockResolvedValueOnce(null);
      await expect(claimCharacter(SESSION, INPUT)).rejects.toBeInstanceOf(
        CharacterWithoutRealmError,
      );
      expect(createCharacter).not.toHaveBeenCalled();
    });

    it('refreshes the new character from Blizzard', async () => {
      await claimCharacter(SESSION, INPUT);
      expect(updateCharacterById).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ currentPeriodKeyCount: 4, ilvl: 612, ManaforgeBuff: '6' }),
      );
    });
  });

  describe('known character', () => {
    it('links it to the user and to its guild realm, pending for a member', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: null });
      const result = await claimCharacter(SESSION, INPUT);
      expect(result).toEqual({ success: true, updated: true, characterId: 5 });
      expect(updateCharacterById).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ userId: 'u1', realmId: 3, status: 'pending' }),
      );
    });

    it('approves it in the guest realm when it has no realm nor guild', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: null });
      findRealmByNameAndRegion.mockResolvedValueOnce(null);
      getGuestMembershipsByUserId.mockResolvedValueOnce([{ realmId: 8 }]);
      await claimCharacter(SESSION, INPUT);
      expect(updateCharacterById).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ realmId: 8, status: 'approved' }),
      );
    });

    it('keeps its current realm when no guild realm is found', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: 4 });
      findRealmByNameAndRegion.mockResolvedValueOnce(null);
      await claimCharacter(SESSION, INPUT);
      expect(getGuestMembershipsByUserId).not.toHaveBeenCalled();
      expect(updateCharacterById).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ realmId: 4, status: 'pending' }),
      );
    });

    it('approves it for an admin of its guild realm, and rewrites its class', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: null });
      getRealmUserRole.mockResolvedValueOnce('admin');
      await claimCharacter(SESSION, INPUT);
      expect(getRealmUserRole).toHaveBeenCalledWith(3, 'u1');
      expect(updateCharacterById).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ realmId: 3, status: 'approved', class: 'death_knight' }),
      );
    });

    it('refreshes it from Blizzard with the upper-case region', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: 3 });
      await claimCharacter(SESSION, INPUT);
      expect(getCharacterEnrichedData).toHaveBeenCalledWith('EU', 'hyjal', 'Arthas');
    });

    it('still succeeds when the Blizzard refresh fails', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: 3 });
      getCharacterEnrichedData.mockRejectedValueOnce(new Error('Blizzard down'));
      await expect(claimCharacter(SESSION, INPUT)).resolves.toMatchObject({ updated: true });
    });
  });

  describe('Blizzard refresh', () => {
    it('writes nothing when Blizzard does not know the character', async () => {
      getCharacterEnrichedData.mockRejectedValueOnce({ response: { status: 404 } });
      await claimCharacter(SESSION, INPUT);
      expect(updateCharacterById).not.toHaveBeenCalled();
    });

    it('does not overwrite the thumbnail with an empty one', async () => {
      getCharacterEnrichedData.mockResolvedValueOnce({ ilvl: 612, thumbnail: '  ' });
      await claimCharacter(SESSION, INPUT);
      expect(updateCharacterById.mock.calls[0][1]).not.toHaveProperty('thumbnail');
    });
  });

  describe('specialization (SIMS-208)', () => {
    it('creates the character without the dps placeholder, then sets its active spec', async () => {
      await claimCharacter(SESSION, INPUT);
      const created = createCharacter.mock.calls[0][0];
      expect(created.spec ?? null).toBeNull();
      expect(created).not.toHaveProperty('specializationId');
      expect(findClassWithSpecializations).toHaveBeenCalledWith('death_knight');
      expect(fillSpecializationIfEmpty).toHaveBeenCalledWith(42, {
        spec: 'Blood',
        specializationId: 250,
      });
    });

    it('sets the active spec of a known character only through the empty-spec guard', async () => {
      findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 5, realmId: 3 });
      await claimCharacter(SESSION, INPUT);
      // L'écriture conditionnelle (repository) laisse une spé choisie à la main.
      expect(fillSpecializationIfEmpty).toHaveBeenCalledWith(5, {
        spec: 'Blood',
        specializationId: 250,
      });
      for (const [, fields] of updateCharacterById.mock.calls) {
        expect(fields).not.toHaveProperty('spec');
        expect(fields).not.toHaveProperty('specializationId');
      }
    });

    it('leaves the spec empty, without failing the claim, when Blizzard gives an unknown one', async () => {
      getCharacterEnrichedData.mockResolvedValueOnce({ ilvl: 612, active_spec: 'Sangre' });
      await expect(claimCharacter(SESSION, INPUT)).resolves.toMatchObject({ created: true });
      expect(fillSpecializationIfEmpty).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('does not fail the claim when the spec cannot be written', async () => {
      fillSpecializationIfEmpty.mockRejectedValueOnce(new Error('db down'));
      await expect(claimCharacter(SESSION, INPUT)).resolves.toMatchObject({ created: true });
    });
  });
});

describe('importGuildMembers', () => {
  it('creates, attaches, skips and ignores members according to their guild', async () => {
    findCharacterIdByNameAndRealm
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 11, realmId: null })
      .mockResolvedValueOnce({ id: 12, realmId: 3 })
      .mockResolvedValueOnce({ id: 13, realmId: 9 });

    const members = ['A', 'B', 'C', 'D'].map((name) => ({
      name,
      realm: { slug: 'hyjal' },
      classId: 8,
    }));
    const result = await importGuildMembers(members, 3);

    expect(result).toMatchObject({ imported: 1, ignored: 1, failed: 0 });
    expect(result.details.map((d) => d.status)).toEqual([
      'created',
      'attached',
      'skipped',
      'ignored_other_guild',
    ]);
    expect(createCharacter).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'A', class: 'mage', realmId: 3, region: 'EU' }),
    );
    expect(updateCharacterById).toHaveBeenCalledWith(11, { realmId: 3 });
  });

  it('creates a member without spec, never the dps placeholder (SIMS-208)', async () => {
    await importGuildMembers([{ name: 'A', realm: 'hyjal', classId: 8 }], 3);
    expect(createCharacter).toHaveBeenCalledWith(expect.objectContaining({ spec: null }));
    expect(createCharacter.mock.calls[0][0]).not.toHaveProperty('specializationId');
  });

  it('fails a member without realm slug instead of searching every realm', async () => {
    const result = await importGuildMembers([{ name: 'A', realm: {} }], 3);
    expect(result).toMatchObject({ failed: 1, imported: 0 });
    expect(findCharacterIdByNameAndRealm).not.toHaveBeenCalled();
  });

  it('keeps importing after a member fails', async () => {
    findCharacterIdByNameAndRealm
      .mockRejectedValueOnce(new Error('db'))
      .mockResolvedValueOnce(null);
    const result = await importGuildMembers(
      [
        { name: 'A', realm: 'hyjal', classId: 8 },
        { name: 'B', realm: 'hyjal', classId: 8 },
      ],
      3,
    );
    expect(result).toMatchObject({ failed: 1, imported: 1 });
  });

  it('ignores a new member whose class is unknown, with a readable reason', async () => {
    findCharacterIdByNameAndRealm.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const result = await importGuildMembers(
      [
        { name: 'A', realm: 'hyjal', classId: 99 },
        { name: 'B', realm: 'hyjal' },
      ],
      3,
    );
    expect(createCharacter).not.toHaveBeenCalled();
    expect(result).toMatchObject({ imported: 0, ignored: 2, failed: 0 });
    expect(result.details).toEqual([
      { name: 'A', status: 'ignored_unknown_class', error: 'classe inconnue (classId 99)' },
      { name: 'B', status: 'ignored_unknown_class', error: 'classe inconnue (classId absent)' },
    ]);
  });

  it('still attaches a known character whose class id is unknown', async () => {
    findCharacterIdByNameAndRealm.mockResolvedValueOnce({ id: 11, realmId: null });
    const result = await importGuildMembers([{ name: 'A', realm: 'hyjal', classId: 99 }], 3);
    expect(updateCharacterById).toHaveBeenCalledWith(11, { realmId: 3 });
    expect(result.details).toEqual([{ name: 'A', status: 'attached' }]);
  });
});
