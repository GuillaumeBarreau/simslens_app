import { RaidDifficultyRequiredError } from '../instance.errors';
import { createInstance } from '../usecases/createInstance';

const createInstanceRow = vi.fn();
const updateInstanceById = vi.fn();
const findInstanceById = vi.fn();
const createInstanceBosses = vi.fn();
const findRaidDifficultyById = vi.fn();
const listBossesForRaid = vi.fn();

vi.mock('../instance.repository', () => ({
  default: {
    createInstance: (...a: unknown[]) => createInstanceRow(...a),
    updateInstanceById: (...a: unknown[]) => updateInstanceById(...a),
    findInstanceById: (...a: unknown[]) => findInstanceById(...a),
  },
}));
vi.mock('../instance.bossInitialisation', () => ({
  instanceBossRepository: {
    createInstanceBosses: (...a: unknown[]) => createInstanceBosses(...a),
  },
}));
vi.mock('../../raid_difficulty/raid_difficulty.repository', () => ({
  default: {
    findRaidDifficultyById: (...a: unknown[]) => findRaidDifficultyById(...a),
    listBossesForRaid: (...a: unknown[]) => listBossesForRaid(...a),
  },
}));

const payload = { name: 'MC', date: new Date('2026-08-16'), raidDifficultyId: 3 };

beforeEach(() => {
  createInstanceRow.mockReset().mockResolvedValue(7);
  updateInstanceById.mockReset().mockResolvedValue(undefined);
  findInstanceById.mockReset().mockResolvedValue({ id: 7 });
  createInstanceBosses.mockReset().mockResolvedValue(undefined);
  findRaidDifficultyById.mockReset().mockResolvedValue({ raidId: 1 });
  listBossesForRaid.mockReset().mockResolvedValue([{ id: 11 }, { id: 12 }]);
});

describe('createInstance', () => {
  it('refuses a payload without a raid difficulty', async () => {
    const withoutDifficulty = { ...payload } as Partial<typeof payload>;
    delete withoutDifficulty.raidDifficultyId;

    await expect(createInstance(withoutDifficulty as typeof payload)).rejects.toBeInstanceOf(
      RaidDifficultyRequiredError,
    );
    expect(createInstanceRow).not.toHaveBeenCalled();
  });

  it('returns the freshly created instance', async () => {
    await expect(createInstance(payload)).resolves.toEqual({ id: 7 });
  });

  it('derives the bosses from the difficulty when none are given', async () => {
    await createInstance(payload);
    expect(createInstanceBosses).toHaveBeenCalledWith(7, [11, 12]);
  });

  it('prefers an explicit boss list over the difficulty', async () => {
    await createInstance({ ...payload, bossIds: [99] });
    expect(listBossesForRaid).not.toHaveBeenCalled();
    expect(createInstanceBosses).toHaveBeenCalledWith(7, [99]);
  });

  it('records the boss count on the instance', async () => {
    await createInstance(payload);
    expect(updateInstanceById).toHaveBeenCalledWith(7, { totalBosses: 2 });
  });

  it('still creates the instance when the difficulty lookup fails', async () => {
    findRaidDifficultyById.mockRejectedValueOnce(new Error('base indisponible'));
    await expect(createInstance(payload)).resolves.toEqual({ id: 7 });
    expect(createInstanceBosses).not.toHaveBeenCalled();
  });

  it('skips the boss initialisation when the raid has none', async () => {
    listBossesForRaid.mockResolvedValueOnce([]);
    await createInstance(payload);
    expect(createInstanceBosses).not.toHaveBeenCalled();
    expect(updateInstanceById).not.toHaveBeenCalled();
  });
});
