import { handleSignupStatusChange } from '../usecases/handleSignupStatusChange';

const findByUserAndDate = vi.fn();
const remove = vi.fn();
const findUniqueEvent = vi.fn();
const findUniqueCharacter = vi.fn();

vi.mock('../absence.repository', () => ({
  default: {
    findByUserAndDate: (...a: unknown[]) => findByUserAndDate(...a),
    remove: (...a: unknown[]) => remove(...a),
  },
}));
vi.mock('../../../data', () => ({
  prisma: {
    raid_events: { findUnique: (...a: unknown[]) => findUniqueEvent(...a) },
    characters: { findUnique: (...a: unknown[]) => findUniqueCharacter(...a) },
  },
}));

const signup = { eventId: 5, characterId: 10 };

beforeEach(() => {
  findByUserAndDate.mockReset().mockResolvedValue({ id: 7, startDate: null, endDate: null });
  remove.mockReset().mockResolvedValue(undefined);
  findUniqueEvent
    .mockReset()
    .mockResolvedValue({ startTime: new Date('2026-07-22T20:00:00'), realmId: 3 });
  findUniqueCharacter.mockReset().mockResolvedValue({ userId: 'u1' });
});

describe('handleSignupStatusChange', () => {
  it('lifts the absence covering the event day', async () => {
    await handleSignupStatusChange(signup, 'PRESENT');
    expect(remove).toHaveBeenCalledWith(7);
  });

  it('does nothing when the member is confirming an absence', async () => {
    await handleSignupStatusChange(signup, 'ABSENT');
    expect(findUniqueEvent).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('gives up quietly when the event no longer exists', async () => {
    findUniqueEvent.mockResolvedValueOnce(null);
    await expect(handleSignupStatusChange(signup, 'PRESENT')).resolves.toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });

  it('gives up quietly when the character no longer exists', async () => {
    findUniqueCharacter.mockResolvedValueOnce(null);
    await expect(handleSignupStatusChange(signup, 'PRESENT')).resolves.toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing when no absence covers that day', async () => {
    findByUserAndDate.mockResolvedValueOnce(null);
    await handleSignupStatusChange(signup, 'PRESENT');
    expect(remove).not.toHaveBeenCalled();
  });

  it('looks the absence up at the midnight of the event day', async () => {
    await handleSignupStatusChange(signup, 'PRESENT');
    const [, , date] = findByUserAndDate.mock.calls[0];
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
  });

  it('scopes the lookup to the member and the realm of the event', async () => {
    await handleSignupStatusChange(signup, 'PRESENT');
    expect(findByUserAndDate).toHaveBeenCalledWith('u1', 3, expect.any(Date));
  });

  it.each(['PRESENT', 'TENTATIVE', 'BENCH', 'LATE'])(
    'lifts the absence for the %s status',
    async (status: string) => {
      await handleSignupStatusChange(signup, status);
      expect(remove).toHaveBeenCalledWith(7);
    },
  );
});
