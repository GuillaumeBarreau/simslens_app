import { listRegionsWithServers } from '../usecases/listRegionsWithServers';

const getAllRegions = vi.fn();
const getAllServers = vi.fn();

vi.mock('../region.repository', () => ({
  default: {
    getAllRegions: (...a: unknown[]) => getAllRegions(...a),
    getAllServers: (...a: unknown[]) => getAllServers(...a),
  },
}));

const server = (slug: string, region: string, game = 'retail') => ({
  id: slug.length,
  name: slug,
  slug,
  locale: 'en-GB',
  region,
  game,
});

beforeEach(() => {
  getAllRegions.mockReset().mockResolvedValue([
    { id: 1, name: 'EU' },
    { id: 2, name: 'NA' },
  ]);
  getAllServers.mockReset();
});

describe('listRegionsWithServers', () => {
  it('lists Retail servers by default and keeps regions without servers', async () => {
    getAllServers.mockResolvedValue([server('hyjal', 'EU')]);

    const result = await listRegionsWithServers();

    expect(getAllServers).toHaveBeenCalledWith('retail');
    expect(result).toEqual([
      { id: 1, name: 'EU', servers: [{ id: 5, name: 'hyjal', slug: 'hyjal', locale: 'en-GB' }] },
      { id: 2, name: 'NA', servers: [] },
    ]);
  });

  it('lists the unified Forever servers and omits regions without any', async () => {
    getAllServers.mockResolvedValue([
      server('forever-pve', 'EU', 'forever'),
      server('forever-pvp', 'EU', 'forever'),
    ]);

    const result = await listRegionsWithServers('forever');

    expect(getAllServers).toHaveBeenCalledWith('forever');
    expect(result).toHaveLength(1);
    expect(result[0].servers.map((s) => s.slug)).toEqual(['forever-pve', 'forever-pvp']);
  });
});
