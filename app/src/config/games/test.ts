import {
  EXTENSION_SEASONS,
  getDefaultSeasonForExtension,
  isValidExtension,
  VALID_EXTENSIONS,
} from 'config/seasonConfig';
import { CLASS_TO_ID } from 'constants/classes';

import {
  filterByCapability,
  FOREVER_EXTENSION,
  type GameCapability,
  gameHasCapability,
  GAMES,
  getGameDefinition,
  getGameForExtension,
  resolveDifficulty,
} from '.';

const flags = vi.hoisted(() => ({ forever: true }));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => (feature === 'forever' ? flags.forever : true),
}));

describe('registre des jeux', () => {
  it('déduit Forever de l’extension « Forever »', () => {
    expect(getGameForExtension(FOREVER_EXTENSION)).toBe('forever');
  });

  it('retombe sur Retail pour une extension Retail, inconnue ou absente', () => {
    expect(getGameForExtension('Midnight')).toBe('retail');
    expect(getGameForExtension('The-War-Within')).toBe('retail');
    expect(getGameForExtension('Inconnue')).toBe('retail');
    expect(getGameForExtension('forever')).toBe('retail');
    expect(getGameForExtension(undefined)).toBe('retail');
    expect(getGameForExtension(null)).toBe('retail');
  });

  it('réserve les capacités de chaque jeu à ce jeu', () => {
    expect(gameHasCapability('retail', 'droptimizer')).toBe(true);
    expect(gameHasCapability('retail', 'softReserve')).toBe(false);
    expect(gameHasCapability('forever', 'softReserve')).toBe(true);
    expect(gameHasCapability('forever', 'droptimizer')).toBe(false);
    expect(GAMES.retail.capabilities).toEqual([
      'droptimizer',
      'mythicPlus',
      'raiderIo',
      'talentsApi',
      'simValidation',
    ]);
    expect(GAMES.forever.capabilities).toEqual([
      'bisLists',
      'attunements',
      'lootPriority',
      'softReserve',
      'raidWeekPlanner',
      'resistances',
    ]);
  });

  it('décrit Forever : 9 classes connues, une difficulté, Wowhead /forever/', () => {
    const forever = getGameDefinition('forever');
    expect(forever.classes).toHaveLength(9);
    for (const id of forever.classes) expect(CLASS_TO_ID).toHaveProperty(id);
    expect(forever.classes).not.toContain('death_knight');
    expect(forever.difficulties).toEqual(['normal']);
    expect(forever.wowheadBaseUrl).toBe('https://www.wowhead.com/forever/');
  });

  it('laisse Retail inchangé : toutes les classes, trois difficultés, extensions valides', () => {
    const retail = getGameDefinition('retail');
    expect(retail.classes).toEqual(Object.keys(CLASS_TO_ID));
    expect(retail.difficulties).toEqual(['normal', 'heroic', 'mythic']);
    expect(retail.extensions).toEqual(VALID_EXTENSIONS);
    expect(retail.wowheadBaseUrl).toBe('https://www.wowhead.com/');
  });
});

describe('filterByCapability (SIMS-022)', () => {
  const items: { id: string; capability?: GameCapability }[] = [
    { id: 'tracking' },
    { id: 'optimizer', capability: 'droptimizer' },
    { id: 'dungeons', capability: 'mythicPlus' },
  ];
  const hasFor = (game: 'retail' | 'forever') => (capability: GameCapability) =>
    gameHasCapability(game, capability);

  it('garde tout pour Retail', () => {
    expect(filterByCapability(items, hasFor('retail')).map((i) => i.id)).toEqual([
      'tracking',
      'optimizer',
      'dungeons',
    ]);
  });

  it('retire Droptimizer et donjons pour Forever, garde les entrées sans capacité', () => {
    expect(filterByCapability(items, hasFor('forever')).map((i) => i.id)).toEqual(['tracking']);
  });
});

describe('resolveDifficulty (SIMS-022)', () => {
  it('garde la difficulté choisie quand le jeu la propose (Retail)', () => {
    expect(resolveDifficulty('mythic', GAMES.retail.difficulties)).toBe('mythic');
    expect(resolveDifficulty('heroic', GAMES.retail.difficulties)).toBe('heroic');
  });

  it('impose la seule difficulté de Forever', () => {
    expect(resolveDifficulty('mythic', GAMES.forever.difficulties)).toBe('normal');
    expect(resolveDifficulty('normal', GAMES.forever.difficulties)).toBe('normal');
  });
});

describe('seasonConfig et Forever', () => {
  afterEach(() => {
    flags.forever = true;
  });

  it('donne « tier-1 » comme saison de Forever', () => {
    expect(EXTENSION_SEASONS[FOREVER_EXTENSION]).toEqual(['tier-1']);
    expect(getDefaultSeasonForExtension(FOREVER_EXTENSION)).toBe('tier-1');
  });

  it('n’ajoute pas Forever aux extensions Retail', () => {
    expect(VALID_EXTENSIONS).not.toContain(FOREVER_EXTENSION);
  });

  it('accepte Forever seulement si le flag « forever » est actif', () => {
    expect(isValidExtension(FOREVER_EXTENSION)).toBe(true);
    flags.forever = false;
    expect(isValidExtension(FOREVER_EXTENSION)).toBe(false);
    expect(isValidExtension('Midnight')).toBe(true);
  });

  it('refuse une extension inconnue ou absente', () => {
    expect(isValidExtension('Inconnue')).toBe(false);
    expect(isValidExtension(undefined)).toBe(false);
    expect(isValidExtension('')).toBe(false);
  });
});
