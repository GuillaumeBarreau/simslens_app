import type { GameDefinition } from './types';

export const FOREVER_EXTENSION = 'Forever';

export const forever: GameDefinition = {
  id: 'forever',
  labelKey: 'games.forever',
  classes: [
    'warrior',
    'paladin',
    'hunter',
    'rogue',
    'priest',
    'shaman',
    'mage',
    'warlock',
    'druid',
  ],
  difficulties: ['normal'],
  extensions: [FOREVER_EXTENSION],
  wowheadBaseUrl: 'https://www.wowhead.com/forever/',
  capabilities: [
    'bisLists',
    'attunements',
    'lootPriority',
    'softReserve',
    'raidWeekPlanner',
    'resistances',
  ],
};
