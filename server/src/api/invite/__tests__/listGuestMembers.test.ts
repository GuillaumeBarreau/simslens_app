import { listGuestMembers, pickGuestCharacter } from '../usecases/manageGuestMembers';

const getGuestMembersByRealm = vi.fn();
const getCharactersByUserIds = vi.fn();

vi.mock('../invite.repository', () => ({
  default: {
    getGuestMembersByRealm: (...a: unknown[]) => getGuestMembersByRealm(...a),
    getCharactersByUserIds: (...a: unknown[]) => getCharactersByUserIds(...a),
  },
}));

const character = (overrides: Record<string, unknown>) => ({
  userId: '42',
  name: 'Alt',
  class: 'mage',
  realm: 'hyjal',
  realmId: 9,
  lastModified: new Date('2026-01-01'),
  ...overrides,
});

describe('pickGuestCharacter', () => {
  it('returns null when the guest has no character', () => {
    expect(pickGuestCharacter([], 3)).toBeNull();
  });

  it('prefers a character of the realm over a more recent one elsewhere', () => {
    const picked = pickGuestCharacter(
      [
        character({ name: 'Ailleurs', lastModified: new Date('2026-09-01') }),
        character({ name: 'Ici', realmId: 3, class: 'priest' }),
      ],
      3,
    );
    expect(picked).toEqual({ name: 'Ici', class: 'priest', realm: 'hyjal' });
  });

  it('never exposes a character from another realm', () => {
    expect(pickGuestCharacter([character({ name: 'Ailleurs' })], 3)).toBeNull();
  });

  it('takes the most recently updated character of the realm', () => {
    const picked = pickGuestCharacter(
      [
        character({ name: 'Ancien', realmId: 3 }),
        character({ name: 'Recent', realmId: 3, lastModified: new Date('2026-09-01') }),
      ],
      3,
    );
    expect(picked?.name).toBe('Recent');
  });
});

describe('listGuestMembers', () => {
  beforeEach(() => {
    getGuestMembersByRealm.mockReset().mockResolvedValue([
      { id: 1, realmId: 3, userId: '42' },
      { id: 2, realmId: 3, userId: '77' },
    ]);
    getCharactersByUserIds
      .mockReset()
      .mockResolvedValue([character({ name: 'Shadow', realmId: 3 })]);
  });

  it('attaches a character to each guest, or null', async () => {
    const guests = await listGuestMembers(3);
    expect(getCharactersByUserIds).toHaveBeenCalledWith(['42', '77'], 3);
    expect(guests.map((g) => g.character?.name ?? null)).toEqual(['Shadow', null]);
  });
});
