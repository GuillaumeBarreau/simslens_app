import { DUNGEON_ROLES } from '../../../shared/constants/roles';
import {
  GroupGuestNameRequiredError,
  GroupGuestNotFoundError,
  InvalidDungeonRoleError,
} from '../dungeon_group.errors';
import {
  addGroupGuest,
  removeGroupGuest,
  updateGroupGuestSlot,
} from '../usecases/manageGroupGuests';

const addGuest = vi.fn();
const removeGuest = vi.fn();
const updateGuest = vi.fn();
const findById = vi.fn();

vi.mock('../dungeon_group.repository', () => ({
  default: {
    addGuest: (...a: unknown[]) => addGuest(...a),
    removeGuest: (...a: unknown[]) => removeGuest(...a),
    updateGuest: (...a: unknown[]) => updateGuest(...a),
    findById: (...a: unknown[]) => findById(...a),
  },
}));

const validGuest = { realmId: 3, name: 'Bob', role: 'TANK' };

beforeEach(() => {
  addGuest.mockReset().mockResolvedValue({ id: 1 });
  removeGuest.mockReset().mockResolvedValue({ count: 1 });
  updateGuest.mockReset().mockResolvedValue({ count: 1 });
  findById.mockReset().mockResolvedValue({ id: 42, guests: [] });
});

describe('addGroupGuest', () => {
  it.each(DUNGEON_ROLES)('accepts the %s role', async (role: string) => {
    await expect(addGroupGuest(5, { ...validGuest, role })).resolves.toBeDefined();
    expect(addGuest).toHaveBeenCalledWith(5, expect.objectContaining({ role }));
  });

  it('normalises the role case', async () => {
    await addGroupGuest(5, { ...validGuest, role: 'healer' });
    expect(addGuest).toHaveBeenCalledWith(5, expect.objectContaining({ role: 'HEALER' }));
  });

  it('rejects a raid-only role before writing', async () => {
    await expect(addGroupGuest(5, { ...validGuest, role: 'MELEE' })).rejects.toBeInstanceOf(
      InvalidDungeonRoleError,
    );
    expect(addGuest).not.toHaveBeenCalled();
  });

  it('rejects a blank name before writing', async () => {
    await expect(addGroupGuest(5, { ...validGuest, name: '  ' })).rejects.toBeInstanceOf(
      GroupGuestNameRequiredError,
    );
    expect(addGuest).not.toHaveBeenCalled();
  });

  it('trims the guest name', async () => {
    await addGroupGuest(5, { ...validGuest, name: '  Bob  ' });
    expect(addGuest).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Bob' }));
  });

  it('carries the group id through to the repository', async () => {
    await addGroupGuest(42, validGuest);
    expect(addGuest).toHaveBeenCalledWith(42, expect.anything());
  });

  it('returns the refreshed group', async () => {
    await expect(addGroupGuest(42, validGuest)).resolves.toEqual({ id: 42, guests: [] });
    expect(findById).toHaveBeenCalledWith(42);
  });
});

describe('updateGroupGuestSlot', () => {
  it('places a guest of the group on a slot', async () => {
    await updateGroupGuestSlot(42, 1, 'slot-TANK');
    expect(updateGuest).toHaveBeenCalledWith(42, 1, { slotId: 'slot-TANK' });
  });

  it('takes a guest off the composition with a null slot', async () => {
    await updateGroupGuestSlot(42, 1, null);
    expect(updateGuest).toHaveBeenCalledWith(42, 1, { slotId: null });
  });

  it('returns the refreshed group', async () => {
    await expect(updateGroupGuestSlot(42, 1, null)).resolves.toEqual({ id: 42, guests: [] });
  });

  it('refuses a guest of another group (SIMS-162)', async () => {
    updateGuest.mockResolvedValueOnce({ count: 0 });
    await expect(updateGroupGuestSlot(42, 99, null)).rejects.toBeInstanceOf(
      GroupGuestNotFoundError,
    );
  });
});

describe('removeGroupGuest', () => {
  it('removes the guest within the group and returns the refreshed group', async () => {
    await expect(removeGroupGuest(42, 9)).resolves.toEqual({ id: 42, guests: [] });
    expect(removeGuest).toHaveBeenCalledWith(42, 9);
  });

  it('refuses a guest of another group (SIMS-162)', async () => {
    removeGuest.mockResolvedValueOnce({ count: 0 });
    await expect(removeGroupGuest(42, 99)).rejects.toBeInstanceOf(GroupGuestNotFoundError);
    expect(findById).not.toHaveBeenCalled();
  });
});
