import { REALM_OWNER_ROLES } from '../realm.constants';
import {
  addRealmOwner,
  removeRealmOwner,
  updateRealmOwnerRole,
} from '../usecases/manageRealmOwners';

const getRealmById = vi.fn();
const getRealmOwner = vi.fn();
const addOwner = vi.fn();
const removeOwner = vi.fn();
const updateOwnerRole = vi.fn();

vi.mock('../realm.repository', () => ({
  default: {
    getRealmById: (...a: unknown[]) => getRealmById(...a),
    getRealmOwner: (...a: unknown[]) => getRealmOwner(...a),
    addRealmOwner: (...a: unknown[]) => addOwner(...a),
    removeRealmOwner: (...a: unknown[]) => removeOwner(...a),
    updateRealmOwnerRole: (...a: unknown[]) => updateOwnerRole(...a),
  },
}));

const asOwner = { id: 1, realmId: 3, ownerId: 'me', role: 'owner' };

beforeEach(() => {
  getRealmById.mockReset().mockResolvedValue({ id: 3 });
  getRealmOwner.mockReset().mockResolvedValue(asOwner);
  addOwner.mockReset().mockResolvedValue(undefined);
  removeOwner.mockReset().mockResolvedValue(1);
  updateOwnerRole.mockReset().mockResolvedValue(1);
});

describe('addRealmOwner', () => {
  it('refuses when the realm does not exist', async () => {
    getRealmById.mockResolvedValueOnce(null);
    await expect(addRealmOwner(3, 'bob', 'admin', 'me')).rejects.toMatchObject({ status: 404 });
  });

  it('refuses an admin who is not the owner', async () => {
    getRealmOwner.mockResolvedValueOnce({ ...asOwner, role: 'admin' });
    await expect(addRealmOwner(3, 'bob', 'admin', 'me')).rejects.toMatchObject({ status: 403 });
    expect(addOwner).not.toHaveBeenCalled();
  });

  it.each(REALM_OWNER_ROLES)('accepts the %s role', async (role: string) => {
    getRealmOwner.mockResolvedValueOnce(asOwner).mockResolvedValueOnce(null);
    await expect(addRealmOwner(3, 'bob', role, 'me')).resolves.toEqual({ success: true });
  });

  it('refuses a role outside the allowed set', async () => {
    await expect(addRealmOwner(3, 'bob', 'member', 'me')).rejects.toMatchObject({ status: 400 });
  });

  it('refuses a user who already holds a role', async () => {
    getRealmOwner.mockResolvedValueOnce(asOwner).mockResolvedValueOnce({ ownerId: 'bob' });
    await expect(addRealmOwner(3, 'bob', 'admin', 'me')).rejects.toMatchObject({ status: 409 });
  });
});

describe('removeRealmOwner', () => {
  it('refuses to remove your own access', async () => {
    await expect(removeRealmOwner(3, 'me', 'me')).rejects.toMatchObject({ status: 400 });
    expect(removeOwner).not.toHaveBeenCalled();
  });

  it('reports a 404 when nothing was removed', async () => {
    removeOwner.mockResolvedValueOnce(0);
    await expect(removeRealmOwner(3, 'bob', 'me')).rejects.toMatchObject({ status: 404 });
  });

  it('removes another owner', async () => {
    await expect(removeRealmOwner(3, 'bob', 'me')).resolves.toEqual({ success: true });
  });
});

describe('updateRealmOwnerRole', () => {
  it('refuses to change your own role', async () => {
    await expect(updateRealmOwnerRole(3, 'me', 'admin', 'me')).rejects.toMatchObject({
      status: 400,
    });
    expect(updateOwnerRole).not.toHaveBeenCalled();
  });

  it('refuses an invalid role before touching the database', async () => {
    await expect(updateRealmOwnerRole(3, 'bob', 'member', 'me')).rejects.toMatchObject({
      status: 400,
    });
    expect(updateOwnerRole).not.toHaveBeenCalled();
  });

  it('reports a 404 when nothing was updated', async () => {
    updateOwnerRole.mockResolvedValueOnce(0);
    await expect(updateRealmOwnerRole(3, 'bob', 'admin', 'me')).rejects.toMatchObject({
      status: 404,
    });
  });
});
