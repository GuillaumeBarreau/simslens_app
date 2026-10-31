import { guestMemberParam } from '../invite.validation';
import { removeGuestMember } from '../usecases/manageGuestMembers';

const getGuestMembersByRealm = vi.fn();
const removeGuestMemberRepo = vi.fn();

vi.mock('../invite.repository', () => ({
  default: {
    getGuestMembersByRealm: (...a: unknown[]) => getGuestMembersByRealm(...a),
    removeGuestMember: (...a: unknown[]) => removeGuestMemberRepo(...a),
  },
}));

beforeEach(() => {
  getGuestMembersByRealm.mockReset().mockResolvedValue([{ id: 1234, realmId: 3 }]);
  removeGuestMemberRepo.mockReset().mockResolvedValue({ id: 1234 });
});

describe('removeGuestMember (SIMS-179)', () => {
  it('removes the guest found in the realm', async () => {
    await removeGuestMember(3, 1234);
    expect(getGuestMembersByRealm).toHaveBeenCalledWith(3);
    expect(removeGuestMemberRepo).toHaveBeenCalledWith(1234);
  });

  it('refuses a guest of another realm without deleting anything', async () => {
    await expect(removeGuestMember(3, 1)).rejects.toMatchObject({ status: 404 });
    expect(removeGuestMemberRepo).not.toHaveBeenCalled();
  });
});

describe('guestMemberParam', () => {
  it('converts a digits-only guest id', () => {
    expect(guestMemberParam.validate({ id: '3', guestId: '1234' }).value.guestId).toBe(1234);
  });

  // Number('1.234e3') = 1234 mais parseInt('1.234e3') = 1 : l'écart permettait
  // de supprimer l'invité d'une autre guilde.
  it.each(['1.234e3', '1234abc', '01234', '1234.0'])('refuses the guest id %j', (guestId) => {
    expect(guestMemberParam.validate({ id: '3', guestId }).error).toBeDefined();
  });
});
