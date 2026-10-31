import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Couverture des buffs de raid (SIMS-219) : la base stocke les classes au
 * format `mage`, `demon_hunter`. Chaque buff doit être reconnu sur ses classes
 * fournisseuses dans ce format, et encore dans le format affiché
 * (`Demon Hunter`).
 */
const { normalizeClass } = require('../../../shared/utils/normalizeClass');
const { BUFF_PROVIDERS, providesBuff } = require('../composition.constants');
const { resolveBuffs, selectForBuffs } = require('../composition.selection');
const repo = require('../composition.repository');

// item_upgrade.service requiert un module .ts, que require() ne charge pas
// sous vitest (cf. composition.missingSpecialization.test.js) : on le
// remplace dans le cache avant de charger le service de composition.
const upgradeServicePath = require.resolve('../../item_upgrade/item_upgrade.service');
const servicePath = require.resolve('../composition.service');
const upgradeService = { getCharacterBossUpgrades: async () => [] };
delete require.cache[servicePath];
require.cache[upgradeServicePath] = {
  id: upgradeServicePath,
  filename: upgradeServicePath,
  loaded: true,
  exports: upgradeService,
};
const service = require('../composition.service');

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(() => {
  delete require.cache[upgradeServicePath];
  delete require.cache[servicePath];
});

/** Fournisseurs attendus de chaque buff, au format stocké en base. */
const EXPECTED_PROVIDERS = {
  bloodlust: ['shaman', 'mage', 'hunter', 'evoker'],
  arcaneIntellect: ['mage'],
  fortitude: ['priest'],
  battleShout: ['warrior'],
  mysticTouch: ['monk'],
  chaosBrand: ['demon_hunter'],
  skyfury: ['shaman'],
  markOfTheWild: ['druid'],
  huntersMark: ['hunter'],
  powerInfusion: ['priest'],
};

const DISPLAYED = {
  shaman: 'Shaman',
  mage: 'Mage',
  hunter: 'Hunter',
  evoker: 'Evoker',
  priest: 'Priest',
  warrior: 'Warrior',
  monk: 'Monk',
  demon_hunter: 'Demon Hunter',
  druid: 'Druid',
};

const ALL_CLASSES = [
  'death_knight',
  'demon_hunter',
  'druid',
  'evoker',
  'hunter',
  'mage',
  'monk',
  'paladin',
  'priest',
  'rogue',
  'shaman',
  'warlock',
  'warrior',
];

const providerCases = Object.entries(EXPECTED_PROVIDERS).flatMap(([key, classes]) =>
  classes.map((cls) => [key, cls]),
);

describe('BUFF_PROVIDERS', () => {
  it('lists every buff with its providers in the stored format', () => {
    expect(BUFF_PROVIDERS).toEqual(EXPECTED_PROVIDERS);
    for (const classes of Object.values(BUFF_PROVIDERS)) {
      for (const cls of classes) expect(normalizeClass(cls)).toBe(cls);
    }
  });
});

describe('providesBuff', () => {
  it.each(providerCases)('recognizes %s on %s as stored in the database', (key, cls) => {
    expect(providesBuff(BUFF_PROVIDERS[key], cls)).toBe(true);
  });

  it.each(providerCases)('recognizes %s on %s in the displayed format', (key, cls) => {
    expect(providesBuff(BUFF_PROVIDERS[key], DISPLAYED[cls])).toBe(true);
  });

  it.each(Object.keys(EXPECTED_PROVIDERS))('ignores the other classes for %s', (key) => {
    const others = ALL_CLASSES.filter((c) => !EXPECTED_PROVIDERS[key].includes(c));
    for (const cls of others) expect(providesBuff(BUFF_PROVIDERS[key], cls)).toBe(false);
  });

  it('is false for a character without class', () => {
    expect(providesBuff(BUFF_PROVIDERS.arcaneIntellect, null)).toBe(false);
    expect(providesBuff(BUFF_PROVIDERS.arcaneIntellect, '')).toBe(false);
  });
});

describe('selectForBuffs with the realm buffs', () => {
  const run = ({ candidates, selectedClasses = [] }) => {
    const selected = new Map();
    const warnings = [];
    const activeBuffs = resolveBuffs({ powerInfusion: true })
      .filter((b) => b.enabled)
      .map((b) => ({ key: b.key, classes: b.providers }));
    selectForBuffs({
      bossId: 1,
      candidatesByRole: { MELEE: candidates },
      selected,
      selectedClasses: new Set(selectedClasses),
      roleTargets: { TANK: 0, HEALER: 0, MELEE: 20, RANGED: 0 },
      roleFilled: { TANK: 0, HEALER: 0, MELEE: 0, RANGED: 0 },
      scoredByCandidateId: new Map(),
      activeBuffs,
      warnings,
    });
    return { selected, warnings };
  };

  const pool = (format) =>
    ['mage', 'priest', 'warrior', 'monk', 'demon_hunter', 'shaman', 'druid', 'hunter'].map(
      (cls, i) => ({ characterId: i + 1, class: format(cls), isPrimaryRole: true }),
    );

  it('covers every buff with classes as stored in the database', () => {
    const { selected, warnings } = run({ candidates: pool((c) => c) });
    expect(warnings).toEqual([]);
    const reasons = [...selected.values()].map((s) => s.reason);
    expect(reasons).toContain('buff:chaosBrand');
    // Le mage choisi pour la furie sanguinaire apporte aussi l'Intelligence des arcanes.
    expect(selected.get(1).reason).toBe('buff:bloodlust');
    expect(reasons).not.toContain('buff:arcaneIntellect');
  });

  it('covers every buff with classes in the displayed format', () => {
    const { warnings } = run({ candidates: pool((c) => DISPLAYED[c]) });
    expect(warnings).toEqual([]);
  });

  it('counts a buff as covered by an already selected class in the stored format', () => {
    const { selected } = run({
      candidates: [{ characterId: 1, class: 'demon_hunter', isPrimaryRole: true }],
      selectedClasses: ['demon_hunter'],
    });
    expect(selected.size).toBe(0);
  });
});

describe('composition service — buffs', () => {
  const signup = (id, cls, spec, role) => ({
    characterId: id,
    role,
    character: {
      id,
      name: `Char${id}`,
      class: cls,
      userId: `user-${id}`,
      realmId: 3,
      specialization: { id: id * 10, name: spec, role: role.toLowerCase() },
    },
  });

  // Dix joueurs : 2 tanks, 2 soigneurs, 3 mêlées et 3 distances à placer.
  const SIGNUPS = [
    signup(1, 'mage', 'Frost', 'RANGED'),
    signup(2, 'demon_hunter', 'Havoc', 'MELEE'),
    signup(3, 'paladin', 'Protection', 'TANK'),
    signup(4, 'paladin', 'Protection', 'TANK'),
    signup(5, 'paladin', 'Holy', 'HEALER'),
    signup(6, 'paladin', 'Holy', 'HEALER'),
    signup(7, 'rogue', 'Outlaw', 'MELEE'),
    signup(8, 'rogue', 'Outlaw', 'MELEE'),
    signup(9, 'warlock', 'Affliction', 'RANGED'),
    signup(10, 'warlock', 'Affliction', 'RANGED'),
  ];

  function mockRepository() {
    vi.spyOn(repo, 'getEventContext').mockResolvedValue({
      id: 5,
      title: 'Raid',
      startTime: new Date('2026-10-10T20:00:00Z'),
      raidDifficultyId: 2,
      raid_difficulty: {
        id: 2,
        difficulty: 'heroic',
        raid: { id: 1, name: 'Raid', extension: 'tww', season: '3' },
      },
    });
    vi.spyOn(repo, 'getBossesForRaid').mockResolvedValue([
      { id: 100, name: 'Boss', order: 1, icon: null, raidName: 'Raid' },
    ]);
    vi.spyOn(repo, 'getPresentPool').mockResolvedValue(SIGNUPS);
    vi.spyOn(repo, 'getPastBossAssignments').mockResolvedValue([]);
    vi.spyOn(repo, 'getValidationSettings').mockResolvedValue(null);
  }

  it('lists the buffs each character brings', async () => {
    mockRepository();
    const context = await service.buildCompositionContext({ eventId: 5, realmId: 3 });

    const byId = Object.fromEntries(context.pool.map((p) => [p.characterId, p.buffsBrought]));
    expect(byId[1]).toEqual(['bloodlust', 'arcaneIntellect']);
    expect(byId[2]).toEqual(['chaosBrand']);
    expect(byId[7]).toEqual([]);
  });

  it('does not report as uncovered a buff a signed-up character provides', async () => {
    mockRepository();
    const result = await service.generateComposition({ eventId: 5, realmId: 3 });

    const uncovered = result.warnings.filter((w) => w.type === 'buff_uncovered').map((w) => w.buff);
    expect(uncovered).not.toContain('arcaneIntellect');
    expect(uncovered).not.toContain('bloodlust');
    expect(uncovered).not.toContain('chaosBrand');
    expect(uncovered).toContain('fortitude');
    const assigned = result.bosses[0].assignments.map((a) => a.characterId);
    expect(assigned).toEqual(expect.arrayContaining([1, 2]));
  });
});
