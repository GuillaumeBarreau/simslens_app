import type { RealmEntity } from '../realm.types';
import { listMyRealms, mergeMyRealms } from '../usecases/listMyRealms';

const findOwnershipsByUserId = vi.fn();
const findRealmsByMemberUserId = vi.fn();
const getGuestMembershipsByUserId = vi.fn();

vi.mock('../realm.repository', () => ({
  default: {
    findOwnershipsByUserId: (...a: unknown[]) => findOwnershipsByUserId(...a),
    findRealmsByMemberUserId: (...a: unknown[]) => findRealmsByMemberUserId(...a),
  },
}));
vi.mock('../../invite/invite.repository', () => ({
  default: {
    getGuestMembershipsByUserId: (...a: unknown[]) => getGuestMembershipsByUserId(...a),
  },
}));

const realm = (id: number, guildName: string, game: 'retail' | 'forever' = 'retail') =>
  ({ id, guildName, server: 'hyjal', region: 'EU', game }) as RealmEntity;

beforeEach(() => {
  findOwnershipsByUserId.mockReset().mockResolvedValue([]);
  findRealmsByMemberUserId.mockReset().mockResolvedValue([]);
  getGuestMembershipsByUserId.mockReset().mockResolvedValue([]);
});

describe('mergeMyRealms', () => {
  it('keeps the highest role of a realm seen several ways', () => {
    const result = mergeMyRealms([
      { realm: realm(1, 'Nocturne'), role: 'member' },
      { realm: realm(1, 'Nocturne'), role: 'admin' },
      { realm: realm(1, 'Nocturne'), role: 'guest' },
    ]);
    expect(result).toEqual([
      {
        id: 1,
        guildName: 'Nocturne',
        server: 'hyjal',
        region: 'EU',
        game: 'retail',
        role: 'admin',
      },
    ]);
  });

  it('sorts by game, then by name', () => {
    const result = mergeMyRealms([
      { realm: realm(3, 'Zeta', 'retail'), role: 'member' },
      { realm: realm(2, 'Alpha', 'retail'), role: 'member' },
      { realm: realm(4, 'Beta', 'forever'), role: 'owner' },
    ]);
    expect(result.map((r) => r.guildName)).toEqual(['Beta', 'Alpha', 'Zeta']);
  });
});

describe('listMyRealms', () => {
  it('unites owned, member and guest realms of the user', async () => {
    findOwnershipsByUserId.mockResolvedValue([
      { role: 'owner', realm: realm(1, 'Owned', 'forever') },
    ]);
    findRealmsByMemberUserId.mockResolvedValue([realm(2, 'Member')]);
    getGuestMembershipsByUserId.mockResolvedValue([{ realm: realm(3, 'Guest') }]);

    const result = await listMyRealms('u1');

    expect(findOwnershipsByUserId).toHaveBeenCalledWith('u1');
    expect(result.map((r) => [r.id, r.role, r.game])).toEqual([
      [1, 'owner', 'forever'],
      [3, 'guest', 'retail'],
      [2, 'member', 'retail'],
    ]);
  });
});
