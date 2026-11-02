/**
 * Vocabulaire partagé avec le registre des jeux du serveur (SIMS-020) :
 * garder exactement les mêmes noms de capacités des deux côtés.
 */
export type GameId = 'retail' | 'forever';

export type GameCapability =
  // Retail
  | 'droptimizer'
  | 'mythicPlus'
  | 'raiderIo'
  | 'talentsApi'
  | 'simValidation'
  // Forever
  | 'bisLists'
  | 'attunements'
  | 'lootPriority'
  | 'softReserve'
  | 'raidWeekPlanner'
  | 'resistances';

export type GameDifficulty = 'normal' | 'heroic' | 'mythic';

export interface GameDefinition {
  id: GameId;
  /** Clé i18n du nom affiché (namespace `common`). */
  labelKey: string;
  /** Identifiants de `constants/classes.ts`. */
  classes: readonly string[];
  difficulties: readonly GameDifficulty[];
  /** Extensions (segment `:extension` de l'URL) qui relèvent de ce jeu. */
  extensions: readonly string[];
  /** Base des liens Wowhead, terminée par `/`. */
  wowheadBaseUrl: string;
  capabilities: readonly GameCapability[];
}
