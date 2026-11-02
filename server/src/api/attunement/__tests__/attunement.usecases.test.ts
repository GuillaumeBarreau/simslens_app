import { listRealmAttunements, saveAttunement } from '../usecases';

const findCharacterInRealm = vi.fn();
const listRealmCharacters = vi.fn();
const upsertProgress = vi.fn();

vi.mock('../attunement.repository', () => ({
  default: {
    findCharacterInRealm: (...a: unknown[]) => findCharacterInRealm(...a),
    listRealmCharacters: (...a: unknown[]) => listRealmCharacters(...a),
    upsertProgress: (...a: unknown[]) => upsertProgress(...a),
  },
}));

const NOW = new Date('2026-12-01T20:00:00Z');

beforeEach(() => {
  findCharacterInRealm
    .mockReset()
    .mockResolvedValue({ id: 10, name: 'Aria Dawnsong', class: 'Mage' });
  listRealmCharacters.mockReset();
  upsertProgress
    .mockReset()
    .mockImplementation(async (characterId: number, attunement: string, data: object) => ({
      characterId,
      attunement,
      ...data,
    }));
});

describe('saveAttunement', () => {
  it('saves the progress of a character of the checked realm', async () => {
    const status = await saveAttunement(
      10,
      3,
      'drakefire_amulet',
      { faction: 'alliance', completedSteps: 5 },
      NOW,
    );
    expect(findCharacterInRealm).toHaveBeenCalledWith(10, 3);
    expect(upsertProgress).toHaveBeenCalledWith(10, 'drakefire_amulet', {
      faction: 'alliance',
      completedSteps: 5,
      completedAt: null,
    });
    expect(status).toMatchObject({ completedSteps: 5, totalSteps: 16, completed: false });
  });

  it('dates the completion of the last step', async () => {
    await saveAttunement(10, 3, 'drakefire_amulet', { faction: 'horde', completedSteps: 14 }, NOW);
    expect(upsertProgress).toHaveBeenCalledWith(10, 'drakefire_amulet', {
      faction: 'horde',
      completedSteps: 14,
      completedAt: NOW,
    });
  });

  it('refuses more steps than the chain of the faction has', async () => {
    await expect(
      saveAttunement(10, 3, 'drakefire_amulet', { faction: 'horde', completedSteps: 15 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'invalid_step' });
    expect(upsertProgress).not.toHaveBeenCalled();
  });

  it('answers 404 for a character of another realm, without writing', async () => {
    findCharacterInRealm.mockResolvedValueOnce(null);
    await expect(
      saveAttunement(10, 3, 'drakefire_amulet', { faction: 'horde', completedSteps: 1 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'not_found' });
    expect(upsertProgress).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown attunement', async () => {
    await expect(
      saveAttunement(10, 3, 'nope', { faction: 'horde', completedSteps: 1 }),
    ).rejects.toMatchObject({ statusCode: 404, code: 'unknown_attunement' });
  });
});

describe('listRealmAttunements', () => {
  it('lists every attunement for every character, started or not', async () => {
    listRealmCharacters.mockResolvedValue([
      {
        id: 10,
        name: 'Aria Dawnsong',
        class: 'Mage',
        attunements: [
          {
            characterId: 10,
            attunement: 'drakefire_amulet',
            faction: 'alliance',
            completedSteps: 16,
            completedAt: NOW,
          },
        ],
      },
      { id: 11, name: 'Brok Ironhide', class: 'Warrior', attunements: [] },
    ]);

    const result = await listRealmAttunements(3);

    expect(listRealmCharacters).toHaveBeenCalledWith(3);
    expect(result[0].attunements[0]).toMatchObject({ completed: true });
    expect(result[1]).toMatchObject({
      characterId: 11,
      attunements: [{ attunement: 'drakefire_amulet', faction: null, completed: false }],
    });
  });
});
