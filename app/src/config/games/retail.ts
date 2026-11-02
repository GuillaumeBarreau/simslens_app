import { CLASS_TO_ID } from 'constants/classes';

import type { GameDefinition } from './types';

export const retail: GameDefinition = {
  id: 'retail',
  labelKey: 'games.retail',
  classes: Object.keys(CLASS_TO_ID),
  difficulties: ['normal', 'heroic', 'mythic'],
  extensions: ['The-War-Within', 'Midnight'],
  wowheadBaseUrl: 'https://www.wowhead.com/',
  capabilities: ['droptimizer', 'mythicPlus', 'raiderIo', 'talentsApi', 'simValidation'],
};
