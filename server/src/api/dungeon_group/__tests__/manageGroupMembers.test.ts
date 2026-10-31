import { GroupMemberNotFoundError, GroupMemberNotInRealmError } from '../dungeon_group.errors';
import { addGroupMember, removeGroupMember } from '../usecases/manageGroupMembers';

const addMember = vi.fn();
const removeMember = vi.fn();
const findById = vi.fn();
const getRealmUserRole = vi.fn();

vi.mock('../dungeon_group.repository', () => ({
  default: {
    addMember: (...a: unknown[]) => addMember(...a),
    removeMember: (...a: unknown[]) => removeMember(...a),
    findById: (...a: unknown[]) => findById(...a),
  },
}));

vi.mock('../../realm/realm.repository', () => ({
  default: { getRealmUserRole: (...a: unknown[]) => getRealmUserRole(...a) },
}));

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  addMember.mockReset().mockResolvedValue({ id: 7, groupId: 42, userId: 'u1', role: 'TANK' });
  removeMember.mockReset().mockResolvedValue({ count: 1 });
  findById.mockReset().mockResolvedValue({ id: 42, members: [] });
  getRealmUserRole.mockReset().mockResolvedValue('member');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addGroupMember', () => {
  it('adds the member and returns it with the refreshed group', async () => {
    await expect(addGroupMember(42, 3, 'u1', 'TANK')).resolves.toEqual({
      member: { id: 7, groupId: 42, userId: 'u1', role: 'TANK' },
      group: { id: 42, members: [] },
    });
    expect(getRealmUserRole).toHaveBeenCalledWith(3, 'u1');
    expect(addMember).toHaveBeenCalledWith(42, 'u1', 'TANK');
    expect(findById).toHaveBeenCalledWith(42);
  });

  it.each(['admin', 'officer', 'member', 'guest'])(
    'accepts a user with the %s role on the realm',
    async (realmRole: string) => {
      getRealmUserRole.mockResolvedValueOnce(realmRole);
      await expect(addGroupMember(42, 3, 'u1', 'DPS')).resolves.toBeDefined();
      expect(addMember).toHaveBeenCalled();
    },
  );

  it('refuses a user without any role on the realm, before writing', async () => {
    getRealmUserRole.mockResolvedValueOnce(null);
    await expect(addGroupMember(42, 3, 'stranger', 'DPS')).rejects.toBeInstanceOf(
      GroupMemberNotInRealmError,
    );
    expect(addMember).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });

  it('answers 404 for a user outside the realm, to hide whether the account exists', () => {
    expect(new GroupMemberNotInRealmError().statusCode).toBe(404);
  });

  it('accepts a second slot for the same account, shared by several players (SIMS-193)', async () => {
    await addGroupMember(42, 3, 'u1', 'TANK');
    await addGroupMember(42, 3, 'u1', 'HEALER');
    expect(addMember).toHaveBeenNthCalledWith(1, 42, 'u1', 'TANK');
    expect(addMember).toHaveBeenNthCalledWith(2, 42, 'u1', 'HEALER');
  });
});

describe('removeGroupMember', () => {
  it('removes the member within the group and returns the refreshed group', async () => {
    await expect(removeGroupMember(42, 'u1')).resolves.toEqual({ id: 42, members: [] });
    expect(removeMember).toHaveBeenCalledWith(42, 'u1');
  });

  it('answers 404 for a user who is not a member, without reloading the group', async () => {
    removeMember.mockResolvedValueOnce({ count: 0 });
    const error = await removeGroupMember(42, 'ghost').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GroupMemberNotFoundError);
    expect((error as GroupMemberNotFoundError).statusCode).toBe(404);
    expect(findById).not.toHaveBeenCalled();
  });
});
