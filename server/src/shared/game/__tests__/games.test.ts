// Registre des jeux (SIMS-020).
import {
  DEFAULT_GAME,
  GAME_CAPABILITIES,
  GAME_IDS,
  gameFromExtension,
  GAMES,
  getGame,
  hasCapability,
  isGameId,
  raidSize,
  specializationLabel,
} from '../games';

const { ID_TO_CLASS } = require('../../constants/wow');

describe('GAMES', () => {
  it('describes every game id under its own key', () => {
    expect(Object.keys(GAMES).sort()).toEqual([...GAME_IDS].sort());
    for (const id of GAME_IDS) expect(GAMES[id].id).toBe(id);
  });

  it('defaults to retail', () => {
    expect(DEFAULT_GAME).toBe('retail');
  });

  it('only uses class names known to the classes table', () => {
    const known = Object.values(ID_TO_CLASS);
    for (const id of GAME_IDS) {
      for (const className of GAMES[id].playableClasses) expect(known).toContain(className);
    }
  });

  it('keeps every retail class playable on retail', () => {
    expect([...GAMES.retail.playableClasses].sort()).toEqual(
      [...Object.values(ID_TO_CLASS)].sort(),
    );
  });

  it('limits forever to the nine original classes', () => {
    expect([...GAMES.forever.playableClasses].sort()).toEqual(
      [
        'druid',
        'hunter',
        'mage',
        'paladin',
        'priest',
        'rogue',
        'shaman',
        'warlock',
        'warrior',
      ].sort(),
    );
  });

  it('describes difficulties, extensions and tiers', () => {
    expect(GAMES.retail.difficulties).toEqual(['lfr', 'normal', 'heroic', 'mythic']);
    expect(GAMES.retail.extensions).toEqual(['The-War-Within', 'Midnight']);
    expect(GAMES.forever.difficulties).toEqual(['normal']);
    expect(GAMES.forever.extensions).toEqual(['Forever']);
    expect(GAMES.forever.seasons).toEqual(['tier-1']);
  });

  it('assigns each capability to exactly one game', () => {
    for (const capability of GAME_CAPABILITIES) {
      const owners = GAME_IDS.filter((id) => GAMES[id].capabilities.includes(capability));
      expect(owners).toHaveLength(1);
    }
  });

  it('getGame returns the definition', () => {
    expect(getGame('forever')).toBe(GAMES.forever);
  });
});

describe('hasCapability', () => {
  it.each(['droptimizer', 'mythicPlus', 'raiderIo', 'talentsApi', 'simValidation'] as const)(
    'retail has %s, forever does not',
    (capability) => {
      expect(hasCapability('retail', capability)).toBe(true);
      expect(hasCapability('forever', capability)).toBe(false);
    },
  );

  it.each([
    'bisLists',
    'attunements',
    'lootPriority',
    'softReserve',
    'raidWeekPlanner',
    'resistances',
  ] as const)('forever has %s, retail does not', (capability) => {
    expect(hasCapability('forever', capability)).toBe(true);
    expect(hasCapability('retail', capability)).toBe(false);
  });
});

describe('gameFromExtension', () => {
  it('maps Forever to forever', () => {
    expect(gameFromExtension('Forever')).toBe('forever');
  });

  it.each(['The-War-Within', 'Midnight', 'forever', '', undefined, null])(
    'maps %s to retail',
    (extension) => {
      expect(gameFromExtension(extension)).toBe('retail');
    },
  );
});

describe('specializations (SIMS-027)', () => {
  const retailSpecs: {
    name: string;
    class: string;
  }[] = require('../../../scripts/data/specializations.json');

  it('retail offers every spec under its own name', () => {
    expect(GAMES.retail.specializations).toBeNull();
    expect(specializationLabel('retail', 'evoker', 'Devastation')).toBe('Devastation');
    expect(specializationLabel('retail', 'rogue', 'Outlaw')).toBe('Outlaw');
  });

  it('forever only reuses existing retail rows of its playable classes', () => {
    for (const spec of GAMES.forever.specializations ?? []) {
      expect(GAMES.forever.playableClasses).toContain(spec.className);
      expect(retailSpecs).toContainEqual(
        expect.objectContaining({ name: spec.specName, class: spec.className }),
      );
    }
  });

  it('forever offers every retail spec of its nine classes', () => {
    const offered = (GAMES.forever.specializations ?? []).map(
      (s) => `${s.className}:${s.specName}`,
    );
    const expected = retailSpecs
      .filter((s) => GAMES.forever.playableClasses.includes(s.class))
      .map((s) => `${s.class}:${s.name}`);
    expect([...offered].sort()).toEqual([...expected].sort());
  });

  it('renames Outlaw and the two feral roles for forever', () => {
    expect(specializationLabel('forever', 'rogue', 'Outlaw')).toBe('Combat');
    expect(specializationLabel('forever', 'druid', 'Feral')).toBe('Feral Combat (cat)');
    expect(specializationLabel('forever', 'druid', 'Guardian')).toBe('Feral Combat (bear)');
    expect(specializationLabel('forever', 'priest', 'Discipline')).toBe('Discipline');
    expect(specializationLabel('forever', 'hunter', 'Beast Mastery')).toBe('Beast Mastery');
  });

  it.each([
    ['evoker', 'Devastation'],
    ['demon_hunter', 'Havoc'],
    ['death_knight', 'Frost'],
    ['monk', 'Mistweaver'],
    ['rogue', 'Combat'],
  ])('forever does not offer %s %s', (className, specName) => {
    expect(specializationLabel('forever', className, specName)).toBeNull();
  });
});

describe('raidSize', () => {
  it('gives the fixed size of each forever tier-1 raid', () => {
    expect(raidSize('forever', 'The Barrow Deeps')).toBe(10);
    expect(raidSize('forever', 'Hyjal Summit')).toBe(20);
    expect(raidSize('forever', "Onyxia's Lair")).toBe(40);
  });

  it.each([
    ['retail', 'Manaforge Omega'],
    ['forever', 'Manaforge Omega'],
    ['forever', 'constructor'],
  ] as const)('%s has no size for %s', (game, raidName) => {
    expect(raidSize(game, raidName)).toBeNull();
  });
});

describe('isGameId', () => {
  it.each(['retail', 'forever'])('accepts %s', (value) => {
    expect(isGameId(value)).toBe(true);
  });

  it.each(['classic', 'Retail', '', null, undefined, 1])('refuses %s', (value) => {
    expect(isGameId(value)).toBe(false);
  });
});
