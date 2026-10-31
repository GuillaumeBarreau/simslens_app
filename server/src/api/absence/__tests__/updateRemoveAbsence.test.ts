import { AbsenceNotFoundError } from '../absence.errors';
import { removeAbsence, removeAbsenceForRealm } from '../usecases/removeAbsence';
import { updateAbsence, updateAbsenceForRealm } from '../usecases/updateAbsence';

const findById = vi.fn();
const update = vi.fn();
const remove = vi.fn();
const belongsToRealm = vi.fn();
const getUserCharactersInRealm = vi.fn();
const markCharactersAbsent = vi.fn();
const clearAbsentSignups = vi.fn();

vi.mock('../absence.repository', () => ({
  default: {
    findById: (...a: unknown[]) => findById(...a),
    update: (...a: unknown[]) => update(...a),
    remove: (...a: unknown[]) => remove(...a),
    belongsToRealm: (...a: unknown[]) => belongsToRealm(...a),
  },
}));
vi.mock('../absence.signupSync', () => ({
  getUserCharactersInRealm: (...a: unknown[]) => getUserCharactersInRealm(...a),
  markCharactersAbsent: (...a: unknown[]) => markCharactersAbsent(...a),
  clearAbsentSignups: (...a: unknown[]) => clearAbsentSignups(...a),
}));

const existing = {
  id: 1,
  userId: 'u1',
  realmId: 3,
  startDate: new Date('2026-07-22'),
  endDate: new Date('2026-07-22'),
  reason: 'congés',
};

beforeEach(() => {
  findById.mockReset().mockResolvedValue(existing);
  update.mockReset().mockResolvedValue({ ...existing, reason: 'maj' });
  remove.mockReset().mockResolvedValue(existing);
  belongsToRealm.mockReset().mockResolvedValue(true);
  getUserCharactersInRealm.mockReset().mockResolvedValue([{ id: 10, name: 'Bob' }]);
  markCharactersAbsent.mockReset().mockResolvedValue(undefined);
  clearAbsentSignups.mockReset().mockResolvedValue(undefined);
});

describe('updateAbsence', () => {
  it('raises a typed 404 when the absence is gone', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(updateAbsence(1, {})).rejects.toBeInstanceOf(AbsenceNotFoundError);
  });

  it('resyncs the signups when the period changes', async () => {
    await updateAbsence(1, { startDate: new Date('2026-07-23') });
    expect(markCharactersAbsent).toHaveBeenCalled();
  });

  it('leaves the signups alone when only the reason changes', async () => {
    await updateAbsence(1, { reason: 'maladie' });
    expect(markCharactersAbsent).not.toHaveBeenCalled();
  });

  it('keeps the untouched bound of the period', async () => {
    const startDate = new Date('2026-07-23');
    await updateAbsence(1, { startDate });
    expect(markCharactersAbsent).toHaveBeenCalledWith(
      expect.objectContaining({ startDate, endDate: existing.endDate }),
      expect.anything(),
    );
  });

  it('falls back to the stored reason when none is given', async () => {
    await updateAbsence(1, { startDate: new Date('2026-07-23') });
    expect(markCharactersAbsent).toHaveBeenCalledWith(expect.anything(), 'congés');
  });
});

describe('updateAbsenceForRealm', () => {
  it('raises a typed 404 when the absence is out of scope', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(updateAbsenceForRealm(1, { realmId: 9, userId: 'u1' }, {})).rejects.toBeInstanceOf(
      AbsenceNotFoundError,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('scopes the check to both the realm and the member', async () => {
    await updateAbsenceForRealm(1, { realmId: 3, userId: 'u1' }, {});
    expect(belongsToRealm).toHaveBeenCalledWith(1, 3, 'u1');
  });
});

describe('removeAbsence', () => {
  it('raises a typed 404 when the absence is gone', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(removeAbsence(1)).rejects.toBeInstanceOf(AbsenceNotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });

  it('clears the absent signups before deleting', async () => {
    await removeAbsence(1);
    expect(clearAbsentSignups).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(1);
  });

  it('clears over the stored period of the absence', async () => {
    await removeAbsence(1);
    expect(clearAbsentSignups).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: existing.startDate, endDate: existing.endDate }),
    );
  });
});

describe('removeAbsenceForRealm', () => {
  it('raises a typed 404 when the absence is out of scope', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(removeAbsenceForRealm(1, { realmId: 9, userId: 'u1' })).rejects.toBeInstanceOf(
      AbsenceNotFoundError,
    );
    expect(remove).not.toHaveBeenCalled();
  });
});
