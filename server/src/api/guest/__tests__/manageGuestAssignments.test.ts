import { RAID_ROLES } from '../../../shared/constants/roles';
import { GuestNotFoundError, InvalidGuestRoleError } from '../guest.errors';
import {
  assignGuestToBoss,
  listAssignments,
  unassignGuestFromBoss,
} from '../usecases/manageGuestAssignments';

const findAssignmentsByEvent = vi.fn();
const upsertAssignment = vi.fn();
const removeAssignment = vi.fn();
const belongsToEvent = vi.fn();

vi.mock('../guest.repository', () => ({
  default: {
    findAssignmentsByEvent: (...a: unknown[]) => findAssignmentsByEvent(...a),
    upsertAssignment: (...a: unknown[]) => upsertAssignment(...a),
    removeAssignment: (...a: unknown[]) => removeAssignment(...a),
    belongsToEvent: (...a: unknown[]) => belongsToEvent(...a),
  },
}));

beforeEach(() => {
  findAssignmentsByEvent.mockReset().mockResolvedValue([]);
  upsertAssignment.mockReset().mockResolvedValue({ id: 1 });
  removeAssignment.mockReset().mockResolvedValue({ count: 1 });
  belongsToEvent.mockReset().mockResolvedValue(true);
});

describe('listAssignments', () => {
  it('returns the assignments of the event', async () => {
    const rows = [{ id: 1 }];
    findAssignmentsByEvent.mockResolvedValueOnce(rows);
    await expect(listAssignments(7)).resolves.toBe(rows);
    expect(findAssignmentsByEvent).toHaveBeenCalledWith(7);
  });
});

describe('assignGuestToBoss', () => {
  const input = { eventId: 7, guestId: 1, bossId: 2, role: 'HEALER' };

  it.each(RAID_ROLES)('accepts the %s role', async (role: string) => {
    await expect(assignGuestToBoss({ ...input, role })).resolves.toEqual({ id: 1 });
  });

  it('normalises the role case', async () => {
    await assignGuestToBoss({ ...input, role: 'ranged' });
    expect(upsertAssignment).toHaveBeenCalledWith({ guestId: 1, bossId: 2, role: 'RANGED' });
  });

  it('rejects a dungeon role before writing', async () => {
    await expect(assignGuestToBoss({ ...input, role: 'DPS' })).rejects.toBeInstanceOf(
      InvalidGuestRoleError,
    );
    expect(upsertAssignment).not.toHaveBeenCalled();
  });

  it('refuses a guest of another event, before writing (SIMS-162)', async () => {
    belongsToEvent.mockResolvedValueOnce(false);
    await expect(assignGuestToBoss(input)).rejects.toBeInstanceOf(GuestNotFoundError);
    expect(belongsToEvent).toHaveBeenCalledWith(1, 7);
    expect(upsertAssignment).not.toHaveBeenCalled();
  });

  it('carries the valid roles in the error message', async () => {
    await expect(assignGuestToBoss({ ...input, role: 'NOPE' })).rejects.toThrow(
      `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
    );
  });
});

describe('unassignGuestFromBoss', () => {
  it('forwards the assignment key to the repository', async () => {
    await unassignGuestFromBoss({ eventId: 7, guestId: 4, bossId: 9 });
    expect(removeAssignment).toHaveBeenCalledWith({ guestId: 4, bossId: 9 });
  });

  it('refuses a guest of another event, before deleting (SIMS-162)', async () => {
    belongsToEvent.mockResolvedValueOnce(false);
    await expect(
      unassignGuestFromBoss({ eventId: 7, guestId: 4, bossId: 9 }),
    ).rejects.toBeInstanceOf(GuestNotFoundError);
    expect(removeAssignment).not.toHaveBeenCalled();
  });

  it('resolves to nothing', async () => {
    await expect(
      unassignGuestFromBoss({ eventId: 7, guestId: 4, bossId: 9 }),
    ).resolves.toBeUndefined();
  });
});
