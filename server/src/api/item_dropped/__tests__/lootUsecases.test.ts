import { ForbiddenError } from '../../../shared/errors/AppError';
import { LootNotFoundError } from '../item_dropped.errors';
import { getLoot, listInstanceLoots } from '../usecases/listInstanceLoots';
import { assignLoot, removeLoot } from '../usecases/manageLoot';

const listByInstance = vi.fn();
const findById = vi.fn();
const updateById = vi.fn();
const deleteById = vi.fn();

vi.mock('../item_dropped.repository', () => ({
  default: {
    listInstanceLootsByInstanceId: (...a: unknown[]) => listByInstance(...a),
    findInstanceLootById: (...a: unknown[]) => findById(...a),
    updateInstanceLootById: (...a: unknown[]) => updateById(...a),
    deleteInstanceLootById: (...a: unknown[]) => deleteById(...a),
  },
}));

const findInstance = vi.fn();

vi.mock('../../instance/instance.repository', () => ({
  default: { findInstanceById: (...a: unknown[]) => findInstance(...a) },
}));

beforeEach(() => {
  findInstance.mockReset().mockResolvedValue({ id: 5, realmId: 3 });
  listByInstance.mockReset().mockResolvedValue([]);
  findById.mockReset().mockResolvedValue({ id: 1 });
  updateById.mockReset().mockResolvedValue(undefined);
  deleteById.mockReset().mockResolvedValue(undefined);
});

describe('listInstanceLoots', () => {
  it('marks an unassigned loot as pending', async () => {
    listByInstance.mockResolvedValueOnce([{ id: 1, assignedTo: null }]);
    const [loot] = await listInstanceLoots(5);
    expect(loot.isPending).toBe(true);
  });

  it('does not mark an assigned loot as pending', async () => {
    listByInstance.mockResolvedValueOnce([{ id: 1, assignedTo: 9 }]);
    const [loot] = await listInstanceLoots(5);
    expect(loot.isPending).toBe(false);
  });

  it('forwards the filters to the repository', async () => {
    await listInstanceLoots(5, { bossId: 2, assignedTo: null });
    expect(listByInstance).toHaveBeenCalledWith(5, { bossId: 2, assignedTo: null });
  });

  it('skips the realm check when no realm is given', async () => {
    await listInstanceLoots(5);
    expect(findInstance).not.toHaveBeenCalled();
  });

  it('lists the loot of an instance belonging to the realm', async () => {
    listByInstance.mockResolvedValueOnce([{ id: 1, assignedTo: 9 }]);
    await expect(listInstanceLoots(5, {}, 3)).resolves.toHaveLength(1);
    expect(findInstance).toHaveBeenCalledWith(5);
  });

  it('forbids an instance of another realm', async () => {
    await expect(listInstanceLoots(5, {}, 4)).rejects.toBeInstanceOf(ForbiddenError);
    expect(listByInstance).not.toHaveBeenCalled();
  });

  it('forbids an unknown instance, without telling it apart', async () => {
    findInstance.mockResolvedValueOnce(null);
    await expect(listInstanceLoots(5, {}, 3)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('getLoot', () => {
  it('raises a typed 404 when the loot is gone', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(getLoot(1)).rejects.toBeInstanceOf(LootNotFoundError);
  });
});

describe('assignLoot', () => {
  it('records who received the loot, from whom, and when', async () => {
    await assignLoot(1, 9, 4);
    expect(updateById).toHaveBeenCalledWith(1, {
      assignedTo: 9,
      assignedBy: 4,
      assignedAt: expect.any(Date),
    });
  });

  it('records 0 as assignedBy when the author is unknown', async () => {
    await assignLoot(1, 9, null);
    expect(updateById).toHaveBeenCalledWith(1, expect.objectContaining({ assignedBy: 0 }));
  });

  it('releases the loot when assignedTo is null', async () => {
    await assignLoot(1, null);
    expect(updateById).toHaveBeenCalledWith(1, expect.objectContaining({ assignedTo: null }));
  });

  it('raises a typed 404 when the loot vanished mid-assignment', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(assignLoot(1, 9)).rejects.toBeInstanceOf(LootNotFoundError);
  });
});

describe('removeLoot', () => {
  it('forwards the id and resolves to nothing', async () => {
    await expect(removeLoot(3)).resolves.toBeUndefined();
    expect(deleteById).toHaveBeenCalledWith(3);
  });
});
