import { ValidationError } from '../../../shared/errors/AppError';
import { LEGACY_RAID_DEFAULTS, LEGACY_RAID_ID } from '../raid_listed.constants';
import { getBossesByRaid } from '../usecases/listRaids';

const getBosses = vi.fn();
const findRaidName = vi.fn();

vi.mock('../raid_listed.repository', () => ({
  default: {
    getBossesByRaid: (...a: unknown[]) => getBosses(...a),
    findRaidName: (...a: unknown[]) => findRaidName(...a),
    listAllRaidDifficultyPairs: vi.fn(),
  },
}));

beforeEach(() => {
  getBosses.mockReset().mockResolvedValue([{ id: 1 }]);
  findRaidName.mockReset().mockResolvedValue("Onyxia's Lair");
});

describe('getBossesByRaid', () => {
  it('reads the bosses of the given extension and season', async () => {
    await expect(
      getBossesByRaid(2, { extension: 'Midnight', season: 'season-01' }),
    ).resolves.toEqual([{ id: 1 }]);
    expect(getBosses).toHaveBeenCalledWith('Midnight', 'season-01');
  });

  it('falls back to the legacy raid defaults', async () => {
    await getBossesByRaid(LEGACY_RAID_ID, {});
    expect(getBosses).toHaveBeenCalledWith(
      LEGACY_RAID_DEFAULTS.extension,
      LEGACY_RAID_DEFAULTS.season,
    );
  });

  it.each([
    [undefined, { extension: 'Midnight' }],
    [2, {}],
  ])('answers 400 without extension or season (raid %s)', async (raidId, scope) => {
    const error = await getBossesByRaid(raidId, scope).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      statusCode: 400,
      message: 'Missing extension or season parameters',
    });
    expect(getBosses).not.toHaveBeenCalled();
  });

  it('keeps the Retail query by season only', async () => {
    await getBossesByRaid(2, { extension: 'Midnight', season: 'season-01' });
    expect(findRaidName).not.toHaveBeenCalled();
  });

  it('restricts a Forever tier to the bosses of the requested raid', async () => {
    await getBossesByRaid(9003, { extension: 'Forever', season: 'tier-1' });
    expect(findRaidName).toHaveBeenCalledWith(9003);
    expect(getBosses).toHaveBeenCalledWith('Forever', 'tier-1', "Onyxia's Lair");
  });

  it('answers no boss for an unknown Forever raid', async () => {
    findRaidName.mockResolvedValueOnce(null);
    await expect(
      getBossesByRaid(1234, { extension: 'Forever', season: 'tier-1' }),
    ).resolves.toEqual([]);
    expect(getBosses).not.toHaveBeenCalled();
  });
});
