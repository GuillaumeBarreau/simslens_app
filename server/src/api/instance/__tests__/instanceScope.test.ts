import { InstanceNotFoundError } from '../instance.errors';
import { initializeInstanceBosses } from '../usecases/initializeInstanceBosses';
import { getInstance } from '../usecases/listInstances';
import { deleteInstance, updateInstance } from '../usecases/updateInstance';

const findInstanceById = vi.fn();
const updateInstanceById = vi.fn();
const deleteInstanceById = vi.fn();

vi.mock('../instance.repository', () => ({
  default: {
    findInstanceById: (...a: unknown[]) => findInstanceById(...a),
    updateInstanceById: (...a: unknown[]) => updateInstanceById(...a),
    deleteInstanceById: (...a: unknown[]) => deleteInstanceById(...a),
  },
}));

beforeEach(() => {
  findInstanceById.mockReset().mockResolvedValue({ id: 5, realmId: 3 });
  updateInstanceById.mockReset().mockResolvedValue(undefined);
  deleteInstanceById.mockReset().mockResolvedValue(undefined);
});

describe('instance writes scoped to the checked realm (SIMS-162)', () => {
  it('updates an instance of the realm', async () => {
    await updateInstance(5, { status: 'COMPLETED' }, 3);
    expect(updateInstanceById).toHaveBeenCalledWith(5, { status: 'COMPLETED' });
  });

  it('refuses to update an instance of another realm', async () => {
    await expect(updateInstance(5, { status: 'COMPLETED' }, 9)).rejects.toBeInstanceOf(
      InstanceNotFoundError,
    );
    expect(updateInstanceById).not.toHaveBeenCalled();
  });

  it('refuses to delete an instance of another realm', async () => {
    await expect(deleteInstance(5, 9)).rejects.toBeInstanceOf(InstanceNotFoundError);
    expect(deleteInstanceById).not.toHaveBeenCalled();
  });

  it('refuses to initialise the bosses of an instance of another realm', async () => {
    await expect(initializeInstanceBosses(5, 9, 2)).rejects.toBeInstanceOf(InstanceNotFoundError);
  });

  it('refuses an unknown instance', async () => {
    findInstanceById.mockResolvedValueOnce(null);
    await expect(deleteInstance(5, 3)).rejects.toBeInstanceOf(InstanceNotFoundError);
  });
});

describe('getInstance', () => {
  it('raises a typed 404 for an unknown instance', async () => {
    findInstanceById.mockResolvedValueOnce(null);
    await expect(getInstance(5)).rejects.toBeInstanceOf(InstanceNotFoundError);
  });
});
