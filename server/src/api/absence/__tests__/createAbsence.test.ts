import { createAbsence } from '../usecases/createAbsence';

const findByUserAndDate = vi.fn();
const create = vi.fn();
const getUserCharactersInRealm = vi.fn();
const markCharactersAbsent = vi.fn();

vi.mock('../absence.repository', () => ({
  default: {
    findByUserAndDate: (...a: unknown[]) => findByUserAndDate(...a),
    create: (...a: unknown[]) => create(...a),
  },
}));
vi.mock('../absence.signupSync', () => ({
  getUserCharactersInRealm: (...a: unknown[]) => getUserCharactersInRealm(...a),
  markCharactersAbsent: (...a: unknown[]) => markCharactersAbsent(...a),
}));

const base = {
  userId: 'u1',
  realmId: 3,
  startDate: new Date('2026-07-22T00:00:00'),
  endDate: new Date('2026-07-24T00:00:00'),
};

beforeEach(() => {
  findByUserAndDate.mockReset().mockResolvedValue(null);
  create.mockReset().mockImplementation((d: { startDate: Date }) => ({ id: 1, ...d }));
  getUserCharactersInRealm.mockReset().mockResolvedValue([{ id: 10, name: 'Bob' }]);
  markCharactersAbsent.mockReset().mockResolvedValue(undefined);
});

describe('createAbsence', () => {
  it('creates one absence per day in the range, bounds included', async () => {
    await createAbsence(base);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('creates a single entry for a one-day absence', async () => {
    await createAbsence({ ...base, endDate: base.startDate });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('spans each entry from midnight to end of day', async () => {
    await createAbsence({ ...base, endDate: base.startDate });
    const { startDate, endDate } = create.mock.calls[0][0];
    expect(startDate.getHours()).toBe(0);
    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
  });

  it('skips a day already covered by an absence', async () => {
    findByUserAndDate.mockResolvedValueOnce({ id: 99 });
    await createAbsence(base);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('creates nothing when every day is already covered', async () => {
    findByUserAndDate.mockResolvedValue({ id: 99 });
    await expect(createAbsence(base)).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('returns the first created absence', async () => {
    const result = await createAbsence(base);
    expect(result).toMatchObject({ id: 1 });
  });

  it('marks the signups absent for each created day', async () => {
    await createAbsence(base);
    expect(markCharactersAbsent).toHaveBeenCalledTimes(3);
  });

  it('does not touch signups for a day it skipped', async () => {
    findByUserAndDate.mockResolvedValue({ id: 99 });
    await createAbsence(base);
    expect(markCharactersAbsent).not.toHaveBeenCalled();
  });

  it('looks up the member characters once, not once per day', async () => {
    await createAbsence(base);
    expect(getUserCharactersInRealm).toHaveBeenCalledTimes(1);
  });

  it('normalises a missing reason to null', async () => {
    await createAbsence({ ...base, endDate: base.startDate });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it('forwards the reason to the signup synchronisation', async () => {
    await createAbsence({ ...base, endDate: base.startDate, reason: 'vacances' });
    expect(markCharactersAbsent).toHaveBeenCalledWith(expect.anything(), 'vacances');
  });
});
