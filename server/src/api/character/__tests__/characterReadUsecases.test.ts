import { CharacterNotFoundError } from '../character.errors';
import { checkCharacterMount, hasMount } from '../usecases/checkCharacterMount';
import { getAllCharacterGear } from '../usecases/getAllCharacterGear';
import { getBlizzardEquipment } from '../usecases/getBlizzardEquipment';
import { getCharacterGear } from '../usecases/getCharacterGear';
import { getKeyHistory } from '../usecases/getKeyHistory';
import { getCharacterByDiscordTag, listPendingRoster } from '../usecases/listCharacters';

const findCharacterById = vi.fn();
const findCharacterByDiscordTag = vi.fn();
const listCharactersRosterStatus = vi.fn();
const getLatestGearSnapshot = vi.fn();
const getAllLatestGearSnapshots = vi.fn();
const listKeyCountsForRealmRange = vi.fn();
const getCharacterEquipment = vi.fn();
const getCharacterMountsCollection = vi.fn();

vi.mock('../character.repository', () => ({
  default: {
    findCharacterById: (...a: unknown[]) => findCharacterById(...a),
    findCharacterByDiscordTag: (...a: unknown[]) => findCharacterByDiscordTag(...a),
    listCharactersRosterStatus: (...a: unknown[]) => listCharactersRosterStatus(...a),
    getLatestGearSnapshot: (...a: unknown[]) => getLatestGearSnapshot(...a),
    getAllLatestGearSnapshots: (...a: unknown[]) => getAllLatestGearSnapshots(...a),
    listKeyCountsForRealmRange: (...a: unknown[]) => listKeyCountsForRealmRange(...a),
  },
}));
vi.mock('../../../integrations/blizzard/api', () => ({
  getCharacterEquipment: (...a: unknown[]) => getCharacterEquipment(...a),
  getCharacterMountsCollection: (...a: unknown[]) => getCharacterMountsCollection(...a),
}));

const ARTHAS = { id: 5, name: 'Arthas', realm: 'hyjal', region: 'EU', realmId: 1 };

beforeEach(() => {
  findCharacterById.mockReset().mockResolvedValue(ARTHAS);
  findCharacterByDiscordTag.mockReset().mockResolvedValue(ARTHAS);
  listCharactersRosterStatus.mockReset().mockResolvedValue([]);
  getLatestGearSnapshot.mockReset().mockResolvedValue({ id: 1 });
  getAllLatestGearSnapshots.mockReset().mockResolvedValue({ 5: { id: 1 } });
  listKeyCountsForRealmRange.mockReset().mockResolvedValue([]);
  getCharacterEquipment.mockReset().mockResolvedValue({ equipped_items: [] });
  getCharacterMountsCollection.mockReset().mockResolvedValue({ mounts: [{ mount: { id: 7 } }] });
});

describe('getBlizzardEquipment', () => {
  it('reads the equipment of the character on Blizzard', async () => {
    await expect(getBlizzardEquipment(5)).resolves.toEqual({
      equipment: { equipped_items: [] },
    });
    expect(getCharacterEquipment).toHaveBeenCalledWith('EU', 'hyjal', 'Arthas');
  });

  it('defaults to the eu region', async () => {
    findCharacterById.mockResolvedValueOnce({ ...ARTHAS, region: null });
    await getBlizzardEquipment(5);
    expect(getCharacterEquipment).toHaveBeenCalledWith('eu', 'hyjal', 'Arthas');
  });

  it('refuses an unknown character, without calling Blizzard', async () => {
    findCharacterById.mockResolvedValueOnce(null);
    await expect(getBlizzardEquipment(5)).rejects.toBeInstanceOf(CharacterNotFoundError);
    expect(getCharacterEquipment).not.toHaveBeenCalled();
  });
});

describe('hasMount', () => {
  it('finds a mount of the collection', () => {
    expect(hasMount({ mounts: [{ mount: { id: 3 } }, { mount: { id: 7 } }] }, 7)).toBe(true);
  });

  it('is false for a missing mount, an empty or absent collection', () => {
    expect(hasMount({ mounts: [{ mount: { id: 3 } }] }, 7)).toBe(false);
    expect(hasMount({}, 7)).toBe(false);
    expect(hasMount(null, 7)).toBe(false);
  });
});

describe('checkCharacterMount', () => {
  it('checks the Blizzard collection of the character', async () => {
    await expect(checkCharacterMount(5, 7)).resolves.toEqual({ hasMount: true });
    await expect(checkCharacterMount(5, 8)).resolves.toEqual({ hasMount: false });
    expect(getCharacterMountsCollection).toHaveBeenCalledWith('EU', 'hyjal', 'Arthas');
  });

  it('refuses an unknown character, without calling Blizzard', async () => {
    findCharacterById.mockResolvedValueOnce(null);
    await expect(checkCharacterMount(5, 7)).rejects.toBeInstanceOf(CharacterNotFoundError);
    expect(getCharacterMountsCollection).not.toHaveBeenCalled();
  });
});

describe('getCharacterByDiscordTag', () => {
  it('returns the character carrying the tag', async () => {
    await expect(getCharacterByDiscordTag('arthas')).resolves.toBe(ARTHAS);
    expect(findCharacterByDiscordTag).toHaveBeenCalledWith('arthas');
  });

  it('raises a 404 when no character carries the tag (read by the bot)', async () => {
    findCharacterByDiscordTag.mockResolvedValueOnce(null);
    await expect(getCharacterByDiscordTag('nobody')).rejects.toMatchObject({
      statusCode: 404,
      code: 'not_found',
    });
  });
});

describe('listPendingRoster', () => {
  it('keeps only the pending characters of the realm', async () => {
    listCharactersRosterStatus.mockResolvedValueOnce([
      { id: 1, status: 'pending' },
      { id: 2, status: 'approved' },
    ]);
    await expect(listPendingRoster({ realmId: 3 })).resolves.toEqual([
      { id: 1, status: 'pending' },
    ]);
    expect(listCharactersRosterStatus).toHaveBeenCalledWith({ includePending: true, realmId: 3 });
  });
});

describe('gear', () => {
  it('returns the latest snapshot of a character', async () => {
    await expect(getCharacterGear(5)).resolves.toEqual({ snapshot: { id: 1 } });
    expect(getLatestGearSnapshot).toHaveBeenCalledWith(5);
  });

  it('returns the latest snapshots of several characters', async () => {
    await expect(getAllCharacterGear([5, 6])).resolves.toEqual({ snapshots: { 5: { id: 1 } } });
    expect(getAllLatestGearSnapshots).toHaveBeenCalledWith([5, 6]);
  });
});

describe('getKeyHistory', () => {
  it('counts the keys of the week containing the requested date', async () => {
    // Jeudi 9 avril 2026 : semaine du mercredi 8 avril, 05:00 Paris (03:00 UTC).
    const result = await getKeyHistory({ realmId: 3, weekStart: new Date('2026-04-09T12:00Z') });
    expect(result.weekStart).toBe('2026-04-08T03:00:00.000Z');
    expect(result.weekEnd).toBe('2026-04-15T03:00:00.000Z');
    expect(result.minLevel).toBe(10);
    // Historique depuis le 1er avril 00:00 UTC, avant le reset de ce mercredi :
    // première semaine, celle du 25 mars (heure d'hiver, 04:00 UTC).
    expect(result.weeks[0]).toBe('2026-03-25T04:00:00.000Z');
    expect(listKeyCountsForRealmRange).toHaveBeenCalledWith(
      3,
      new Date('2026-04-08T03:00:00.000Z'),
      new Date('2026-04-15T03:00:00.000Z'),
      10,
    );
  });

  it('passes the requested minimum level', async () => {
    await getKeyHistory({ realmId: 3, minLevel: 12 });
    expect(listKeyCountsForRealmRange).toHaveBeenCalledWith(
      3,
      expect.any(Date),
      expect.any(Date),
      12,
    );
  });
});
