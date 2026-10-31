import { ValidationError } from '../../../shared/errors/AppError';
import { LEGACY_RAID_DEFAULTS, LEGACY_RAID_ID } from '../raid_listed.constants';
import { getBossesByRaid } from '../usecases/listRaids';

const getBosses = vi.fn();

vi.mock('../raid_listed.repository', () => ({
  default: {
    getBossesByRaid: (...a: unknown[]) => getBosses(...a),
    listAllRaidDifficultyPairs: vi.fn(),
  },
}));

beforeEach(() => {
  getBosses.mockReset().mockResolvedValue([{ id: 1 }]);
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
});
