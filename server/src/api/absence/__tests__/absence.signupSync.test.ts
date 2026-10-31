import { clearAbsentSignups, markCharactersAbsent } from '../absence.signupSync';

const findAll = vi.fn();
const upsert = vi.fn();
const findByEventAndCharacter = vi.fn();
const removeSignup = vi.fn();

vi.mock('../../event/event.repository', () => ({
  default: { findAll: (...a: unknown[]) => findAll(...a) },
}));
vi.mock('../../signup/signup.repository', () => ({
  default: {
    upsert: (...a: unknown[]) => upsert(...a),
    findByEventAndCharacter: (...a: unknown[]) => findByEventAndCharacter(...a),
    remove: (...a: unknown[]) => removeSignup(...a),
  },
}));
vi.mock('../../../data', () => ({ prisma: {} }));

const window = {
  realmId: 3,
  startDate: new Date('2026-07-22'),
  endDate: new Date('2026-07-22'),
  characters: [
    { id: 10, name: 'Bob' },
    { id: 11, name: 'Alice' },
  ],
};

beforeEach(() => {
  findAll.mockReset().mockResolvedValue([{ id: 1 }, { id: 2 }]);
  upsert.mockReset().mockResolvedValue(undefined);
  findByEventAndCharacter.mockReset().mockResolvedValue({ status: 'ABSENT' });
  removeSignup.mockReset().mockResolvedValue(undefined);
});

describe('markCharactersAbsent', () => {
  it('marks every character on every event of the window', async () => {
    await markCharactersAbsent(window, null);
    expect(upsert).toHaveBeenCalledTimes(4);
  });

  it('carries the reason onto each signup', async () => {
    await markCharactersAbsent(window, 'congés');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ absenceReason: 'congés' }));
  });

  it('does nothing when no event falls in the window', async () => {
    findAll.mockResolvedValueOnce([]);
    await markCharactersAbsent(window, null);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('keeps going when one signup fails', async () => {
    upsert.mockRejectedValueOnce(new Error('conflit'));
    await expect(markCharactersAbsent(window, null)).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledTimes(4);
  });
});

describe('clearAbsentSignups', () => {
  it('removes the signups it had posted', async () => {
    await clearAbsentSignups(window);
    expect(removeSignup).toHaveBeenCalledTimes(4);
  });

  it('leaves a signup the member changed himself', async () => {
    findByEventAndCharacter.mockResolvedValue({ status: 'PRESENT' });
    await clearAbsentSignups(window);
    expect(removeSignup).not.toHaveBeenCalled();
  });

  it('ignores a character without any signup', async () => {
    findByEventAndCharacter.mockResolvedValue(null);
    await clearAbsentSignups(window);
    expect(removeSignup).not.toHaveBeenCalled();
  });

  it('keeps going when one removal fails', async () => {
    removeSignup.mockRejectedValueOnce(new Error('verrou'));
    await expect(clearAbsentSignups(window)).resolves.toBeUndefined();
    expect(removeSignup).toHaveBeenCalledTimes(4);
  });
});
