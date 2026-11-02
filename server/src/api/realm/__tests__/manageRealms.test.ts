import { CharacterNotAttachableError } from '../realm.errors';
import { addCharacter, checkUserRealm, createRealm } from '../usecases/manageRealms';

const getRealmById = vi.fn();
const addCharacterToRealm = vi.fn();
const findRealmByOwnerId = vi.fn();
const findRealmByDetails = vi.fn();
const createRealmRow = vi.fn();

vi.mock('../realm.repository', () => ({
  default: {
    getRealmById: (...a: unknown[]) => getRealmById(...a),
    addCharacterToRealm: (...a: unknown[]) => addCharacterToRealm(...a),
    findRealmByOwnerId: (...a: unknown[]) => findRealmByOwnerId(...a),
    findRealmByDetails: (...a: unknown[]) => findRealmByDetails(...a),
    createRealm: (...a: unknown[]) => createRealmRow(...a),
  },
}));
const validateGuildExists = vi.fn();
const validateUserInGuild = vi.fn();
vi.mock('../../blizzard/blizzard.service', () => ({
  default: {
    validateGuildExists: (...a: unknown[]) => validateGuildExists(...a),
    validateUserInGuild: (...a: unknown[]) => validateUserInGuild(...a),
  },
}));
const findServerBySlug = vi.fn();
vi.mock('../../region/region.repository', () => ({
  default: { findServerBySlug: (...a: unknown[]) => findServerBySlug(...a) },
}));
vi.mock('../../invite/invite.repository', () => ({
  default: { getGuestMembershipsByUserId: vi.fn() },
}));

beforeEach(() => {
  getRealmById.mockReset().mockResolvedValue({ id: 3 });
  addCharacterToRealm.mockReset().mockResolvedValue(1);
  findRealmByOwnerId.mockReset().mockResolvedValue({ id: 3 });
  findRealmByDetails.mockReset().mockResolvedValue(null);
  createRealmRow.mockReset().mockResolvedValue(3);
  findServerBySlug.mockReset().mockResolvedValue({ slug: 'hyjal', region: 'EU', game: 'retail' });
  validateGuildExists.mockReset().mockResolvedValue(undefined);
  validateUserInGuild.mockReset().mockResolvedValue(true);
});

describe('addCharacter', () => {
  it('attaches the character to the realm', async () => {
    await expect(addCharacter(3, 10)).resolves.toEqual({ success: true });
    expect(addCharacterToRealm).toHaveBeenCalledWith(10, 3);
  });

  it('refuses a character that is missing or belongs to another realm', async () => {
    addCharacterToRealm.mockResolvedValueOnce(0);
    await expect(addCharacter(3, 10)).rejects.toBeInstanceOf(CharacterNotAttachableError);
  });

  it('answers 404 for that refusal', async () => {
    addCharacterToRealm.mockResolvedValueOnce(0);
    await expect(addCharacter(3, 10)).rejects.toMatchObject({
      statusCode: 404,
      code: 'not_found',
    });
  });

  it('refuses an unknown realm before any write', async () => {
    getRealmById.mockResolvedValueOnce(null);
    await expect(addCharacter(3, 10)).rejects.toMatchObject({ status: 404 });
    expect(addCharacterToRealm).not.toHaveBeenCalled();
  });
});

describe('checkUserRealm', () => {
  it('answers { realm: null } to a visitor without session, without querying', async () => {
    await expect(checkUserRealm(undefined)).resolves.toEqual({ realm: null });
    expect(findRealmByOwnerId).not.toHaveBeenCalled();
  });

  it('returns the realm owned by the user', async () => {
    await expect(checkUserRealm('me')).resolves.toEqual({ id: 3 });
  });
});

describe('createRealm', () => {
  it('requires a Battle.net token before calling Blizzard', async () => {
    await expect(
      createRealm({ name: 'Nocturne', server: 'Hyjal', region: 'EU', ownerId: 'me' }),
    ).rejects.toMatchObject({ status: 401, message: 'Battle.net authentication required' });
    expect(createRealmRow).not.toHaveBeenCalled();
  });

  it('creates a Retail realm after checking the guild with Blizzard', async () => {
    await expect(
      createRealm({
        name: 'Nocturne',
        server: 'hyjal',
        region: 'EU',
        ownerId: 'me',
        userToken: 't',
      }),
    ).resolves.toEqual({ id: 3, name: 'Nocturne', server: 'hyjal', region: 'EU', game: 'retail' });
    expect(validateGuildExists).toHaveBeenCalled();
    expect(createRealmRow).toHaveBeenCalledWith(expect.objectContaining({ game: 'retail' }));
  });

  it('creates a Forever realm without Blizzard checks (no Forever API yet)', async () => {
    findServerBySlug.mockResolvedValueOnce({ slug: 'forever-pvp', region: 'EU', game: 'forever' });
    await expect(
      createRealm({
        name: 'Nocturne',
        server: 'forever-pvp',
        region: 'EU',
        ownerId: 'me',
        userToken: 't',
      }),
    ).resolves.toMatchObject({ game: 'forever' });
    expect(validateGuildExists).not.toHaveBeenCalled();
    expect(validateUserInGuild).not.toHaveBeenCalled();
    expect(createRealmRow).toHaveBeenCalledWith(expect.objectContaining({ game: 'forever' }));
  });

  it('treats an unknown server as Retail', async () => {
    findServerBySlug.mockResolvedValueOnce(null);
    await createRealm({
      name: 'Nocturne',
      server: 'nope',
      region: 'EU',
      ownerId: 'me',
      userToken: 't',
    });
    expect(validateGuildExists).toHaveBeenCalled();
  });

  it('refuses a Forever realm that already exists', async () => {
    findServerBySlug.mockResolvedValueOnce({ slug: 'forever-pve', region: 'EU', game: 'forever' });
    findRealmByDetails.mockResolvedValueOnce({ id: 9 });
    await expect(
      createRealm({
        name: 'Nocturne',
        server: 'forever-pve',
        region: 'EU',
        ownerId: 'me',
        userToken: 't',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(createRealmRow).not.toHaveBeenCalled();
  });
});
