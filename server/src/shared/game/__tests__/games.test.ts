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

describe('isGameId', () => {
  it.each(['retail', 'forever'])('accepts %s', (value) => {
    expect(isGameId(value)).toBe(true);
  });

  it.each(['classic', 'Retail', '', null, undefined, 1])('refuses %s', (value) => {
    expect(isGameId(value)).toBe(false);
  });
});
