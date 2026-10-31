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
vi.mock('../../blizzard/blizzard.service', () => ({
  default: { validateGuildExists: vi.fn(), validateUserInGuild: vi.fn() },
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
});
