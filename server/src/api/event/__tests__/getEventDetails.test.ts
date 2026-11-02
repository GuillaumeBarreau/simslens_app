import { EventNotAccessibleError } from '../event.errors';
import { eventRaidSize, getEventDetails } from '../usecases/getEventDetails';

const repo = {
  belongsToRealm: vi.fn(),
  findWithRoster: vi.fn(),
};

vi.mock('../event.repository', () => ({
  default: {
    belongsToRealm: (...a: unknown[]) => repo.belongsToRealm(...a),
    findWithRoster: (...a: unknown[]) => repo.findWithRoster(...a),
  },
}));

const withRaid = (name: string, extension: string) => ({
  raid_difficulty: { raid: { name, extension } },
});

describe('eventRaidSize', () => {
  it.each([
    ['The Barrow Deeps', 10],
    ['Hyjal Summit', 20],
    ["Onyxia's Lair", 40],
  ])('lit la taille du raid Forever %s dans le registre', (name, size) => {
    expect(eventRaidSize(withRaid(name, 'Forever'))).toBe(size);
  });

  it('renvoie null pour un raid Retail (taille flexible)', () => {
    expect(eventRaidSize(withRaid('Manaforge Omega', 'The-War-Within'))).toBeNull();
  });

  it('ne prend pas la taille Forever pour un raid Retail du même nom', () => {
    expect(eventRaidSize(withRaid("Onyxia's Lair", 'Midnight'))).toBeNull();
  });

  it('renvoie null pour un raid Forever non décrit', () => {
    expect(eventRaidSize(withRaid('Unknown Raid', 'Forever'))).toBeNull();
  });

  it('renvoie null sans raid rattaché', () => {
    expect(eventRaidSize({})).toBeNull();
    expect(eventRaidSize({ raid_difficulty: null })).toBeNull();
  });
});

describe('getEventDetails', () => {
  beforeEach(() => {
    repo.belongsToRealm.mockReset();
    repo.findWithRoster.mockReset();
  });

  it("ajoute la taille du raid à l'événement", async () => {
    repo.belongsToRealm.mockResolvedValue(true);
    repo.findWithRoster.mockResolvedValue({ id: 7, ...withRaid('Hyjal Summit', 'Forever') });

    const event = await getEventDetails(7, 3);

    expect(repo.belongsToRealm).toHaveBeenCalledWith(7, 3);
    expect(event).toMatchObject({ id: 7, raidSize: 20 });
  });

  it('expose raidSize null en Retail', async () => {
    repo.belongsToRealm.mockResolvedValue(true);
    repo.findWithRoster.mockResolvedValue({ id: 7, ...withRaid('Manaforge Omega', 'Midnight') });

    expect(await getEventDetails(7, 3)).toMatchObject({ raidSize: null });
  });

  it("refuse un événement d'un autre royaume", async () => {
    repo.belongsToRealm.mockResolvedValue(false);

    await expect(getEventDetails(7, 3)).rejects.toBeInstanceOf(EventNotAccessibleError);
    expect(repo.findWithRoster).not.toHaveBeenCalled();
  });

  it('refuse un événement introuvable', async () => {
    repo.belongsToRealm.mockResolvedValue(true);
    repo.findWithRoster.mockResolvedValue(null);

    await expect(getEventDetails(7, 3)).rejects.toBeInstanceOf(EventNotAccessibleError);
  });
});
