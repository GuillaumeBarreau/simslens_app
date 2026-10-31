import { getRosterReplacements } from '../usecases/getRosterReplacements';

/**
 * Rôles des remplaçants (SIMS-207) : la classe est stockée en snake_case
 * (`mage`, `death_knight`). Un Mage Givre remplace un distance, un DK Givre
 * un mêlée, et les rôles hors spé de la classe sont reconnus.
 */

const findManySignups = vi.fn();
const getEventContext = vi.fn();
const getValidationSettings = vi.fn();
const findByEvent = vi.fn();
const getAvailablePool = vi.fn();

vi.mock('../../../data', () => ({
  prisma: { raid_signups: { findMany: (...a: unknown[]) => findManySignups(...a) } },
}));
vi.mock('../../composition/composition.repository', () => ({
  default: {
    getEventContext: (...a: unknown[]) => getEventContext(...a),
    getValidationSettings: (...a: unknown[]) => getValidationSettings(...a),
  },
}));
vi.mock('../roster.repository', () => ({
  default: { findByEvent: (...a: unknown[]) => findByEvent(...a) },
}));
vi.mock('../usecases/getAvailablePool', () => ({
  getAvailablePool: (...a: unknown[]) => getAvailablePool(...a),
}));
vi.mock('../../item_upgrade/item_upgrade.service', () => ({
  default: { getCharacterBossUpgrades: async () => [] },
}));

function holder(characterId: number, role: string, cls: string) {
  return {
    bossId: 1,
    characterId,
    role,
    character: { name: `holder${characterId}`, class: cls, userId: `h${characterId}` },
  };
}

function poolCharacter(id: number, cls: string, spec: string, specRole: string | null = null) {
  return {
    id,
    name: `char${id}`,
    class: cls,
    userId: `u${id}`,
    specialization: { id: 100 + id, name: spec, role: specRole },
  };
}

beforeEach(() => {
  getEventContext.mockReset().mockResolvedValue({ id: 5, raid_difficulty: null });
  getValidationSettings.mockReset().mockResolvedValue({ raidBuffsConfig: {} });
  findManySignups.mockReset().mockResolvedValue([
    { characterId: 1, status: 'ABSENT', character: { userId: 'h1' } },
    { characterId: 2, status: 'PRESENT', character: { userId: 'h2' } },
  ]);
  getAvailablePool
    .mockReset()
    .mockResolvedValue([
      poolCharacter(10, 'mage', 'Frost'),
      poolCharacter(11, 'death_knight', 'Frost'),
      poolCharacter(12, 'demon_hunter', 'Devourer', 'ranged'),
      poolCharacter(13, 'evoker', 'Augmentation', 'dps'),
    ]);
});

async function replacementsFor(role: string, cls = 'warlock') {
  findByEvent.mockReset().mockResolvedValue([holder(1, role, cls), holder(2, 'TANK', 'warrior')]);
  const [vacancy] = await getRosterReplacements(5, 3);
  return vacancy.replacements.map((r) => ({ name: r.name, isPrimaryRole: r.isPrimaryRole }));
}

describe('getRosterReplacements — roles of the candidates', () => {
  it('proposes the Frost Mage, Devourer and Augmentation for a ranged spot', async () => {
    expect(await replacementsFor('RANGED')).toEqual([
      { name: 'char10', isPrimaryRole: true },
      { name: 'char12', isPrimaryRole: true },
      { name: 'char13', isPrimaryRole: true },
    ]);
  });

  it('proposes the Frost Death Knight for a melee spot, and the Devourer as off-spec', async () => {
    expect(await replacementsFor('MELEE', 'rogue')).toEqual([
      { name: 'char11', isPrimaryRole: true },
      { name: 'char12', isPrimaryRole: false },
    ]);
  });

  it('recognizes the tank off-spec of a stored death_knight class', async () => {
    expect(await replacementsFor('TANK', 'paladin')).toEqual([
      { name: 'char11', isPrimaryRole: false },
      { name: 'char12', isPrimaryRole: false },
    ]);
  });
});

describe('getRosterReplacements — candidates without specialization (SIMS-209)', () => {
  function withoutSpec(id: number, cls: string, signupRole: string | null) {
    return {
      id,
      name: `char${id}`,
      class: cls,
      userId: `u${id}`,
      specialization: null,
      signupStatus: signupRole ? 'PRESENT' : 'INHERITED',
      signupRole,
    };
  }

  async function replacementsWith(pool: unknown[], role: string, cls: string) {
    getAvailablePool.mockReset().mockResolvedValue(pool);
    findByEvent.mockReset().mockResolvedValue([holder(1, role, cls), holder(2, 'TANK', 'warrior')]);
    const [vacancy] = await getRosterReplacements(5, 3);
    return vacancy.replacements.map((r) => ({
      name: r.name,
      isPrimaryRole: r.isPrimaryRole,
      missingSpecialization: r.missingSpecialization,
    }));
  }

  it('proposes a PRESENT signup without spec, in the role declared at signup', async () => {
    expect(
      await replacementsWith([withoutSpec(20, 'paladin', 'HEALER')], 'HEALER', 'priest'),
    ).toEqual([{ name: 'char20', isPrimaryRole: true, missingSpecialization: true }]);
  });

  it('proposes a character without spec nor role as off-spec of its class', async () => {
    expect(await replacementsWith([withoutSpec(21, 'paladin', null)], 'MELEE', 'rogue')).toEqual([
      { name: 'char21', isPrimaryRole: false, missingSpecialization: true },
    ]);
  });

  it('flags the candidates that have a specialization', async () => {
    expect(
      await replacementsWith([poolCharacter(10, 'mage', 'Frost')], 'RANGED', 'warlock'),
    ).toEqual([{ name: 'char10', isPrimaryRole: true, missingSpecialization: false }]);
  });
});
