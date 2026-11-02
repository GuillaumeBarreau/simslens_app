/**
 * Registre des jeux (SIMS-020).
 *
 * SimsLens gère deux jeux : World of Warcraft Retail et WoW Forever. Chaque jeu est
 * décrit ici de façon déclarative ; le code partagé lit ce registre au lieu de
 * constantes propres à Retail, et les fonctionnalités propres à un jeu sont activées
 * par capacité (`hasCapability`). Voir docs/forever/README.md §7.
 *
 * `GameId` est défini ici, indépendamment du client Prisma : le registre doit pouvoir
 * être chargé sans base de données (scripts, tests).
 */

export const GAME_IDS = ['retail', 'forever'] as const;

export type GameId = (typeof GAME_IDS)[number];

/** Jeu par défaut : tout ce qui existait avant l'axe `game` est Retail. */
export const DEFAULT_GAME: GameId = 'retail';

export const GAME_CAPABILITIES = [
  // Retail
  'droptimizer',
  'mythicPlus',
  'raiderIo',
  'talentsApi',
  'simValidation',
  // Forever
  'bisLists',
  'attunements',
  'lootPriority',
  'softReserve',
  'raidWeekPlanner',
  'resistances',
] as const;

export type GameCapability = (typeof GAME_CAPABILITIES)[number];

export interface GameDefinition {
  id: GameId;
  /** Classes jouables, noms normalisés de la table `classes` (`shared/constants/wow.js`). */
  playableClasses: readonly string[];
  /** Difficultés de raid proposées. */
  difficulties: readonly string[];
  /** Valeurs de `extension` (raids, boss) qui relèvent de ce jeu. */
  extensions: readonly string[];
  /**
   * Valeurs de `season` connues. Pour Forever, ce sont les paliers (`tier-N`) dans
   * l'ordre. `null` : pas de liste figée, les saisons se lisent en base.
   */
  seasons: readonly string[] | null;
  /**
   * Suffixe du namespace Blizzard (`profile-<suffix>-eu`). Chaîne vide : pas de
   * suffixe (`profile-eu`). `null` : pas d'API Blizzard pour ce jeu.
   */
  blizzardNamespaceSuffix: string | null;
  capabilities: readonly GameCapability[];
}

export const GAMES: Readonly<Record<GameId, GameDefinition>> = {
  retail: {
    id: 'retail',
    playableClasses: [
      'warrior',
      'paladin',
      'hunter',
      'rogue',
      'priest',
      'death_knight',
      'shaman',
      'mage',
      'warlock',
      'monk',
      'druid',
      'demon_hunter',
      'evoker',
    ],
    difficulties: ['lfr', 'normal', 'heroic', 'mythic'],
    extensions: ['The-War-Within', 'Midnight'],
    seasons: null,
    blizzardNamespaceSuffix: '',
    capabilities: ['droptimizer', 'mythicPlus', 'raiderIo', 'talentsApi', 'simValidation'],
  },
  forever: {
    id: 'forever',
    playableClasses: [
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
    extensions: ['Forever'],
    seasons: ['tier-1'],
    // L'API Blizzard n'expose pas encore WoW Forever.
    blizzardNamespaceSuffix: null,
    capabilities: [
      'bisLists',
      'attunements',
      'lootPriority',
      'softReserve',
      'raidWeekPlanner',
      'resistances',
    ],
  },
};

export function isGameId(value: unknown): value is GameId {
  return typeof value === 'string' && (GAME_IDS as readonly string[]).includes(value);
}

export function getGame(game: GameId): GameDefinition {
  return GAMES[game];
}

export function hasCapability(game: GameId, capability: GameCapability): boolean {
  return GAMES[game].capabilities.includes(capability);
}

/**
 * Jeu d'un contenu d'après son `extension` (raids, boss) : `Forever` relève de WoW
 * Forever, tout le reste (y compris une extension absente) de Retail.
 */
export function gameFromExtension(extension?: string | null): GameId {
  return extension === 'Forever' ? 'forever' : 'retail';
}
