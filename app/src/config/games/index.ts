import { forever } from './forever';
import { retail } from './retail';
import type { GameCapability, GameDefinition, GameDifficulty, GameId } from './types';

export { FOREVER_EXTENSION } from './forever';
export type { GameCapability, GameDefinition, GameDifficulty, GameId } from './types';

export const GAMES: Record<GameId, GameDefinition> = { retail, forever };

export const DEFAULT_GAME: GameId = 'retail';

/** Jeu correspondant au segment `:extension` de l'URL ; extension inconnue → Retail. */
export function getGameForExtension(extension?: string | null): GameId {
  if (extension && forever.extensions.includes(extension)) return 'forever';
  return DEFAULT_GAME;
}

export function getGameDefinition(game: GameId): GameDefinition {
  return GAMES[game];
}

export function gameHasCapability(game: GameId, capability: GameCapability): boolean {
  return GAMES[game].capabilities.includes(capability);
}

/** Garde les éléments sans capacité requise ou dont la capacité existe dans le jeu. */
export function filterByCapability<T extends { capability?: GameCapability }>(
  items: readonly T[],
  has: (capability: GameCapability) => boolean,
): T[] {
  return items.filter((item) => !item.capability || has(item.capability));
}

/**
 * Difficulté effective : celle choisie si le jeu la propose, sinon la plus haute du jeu
 * (Forever n'a que « normal »).
 */
export function resolveDifficulty(
  selected: GameDifficulty,
  difficulties: readonly GameDifficulty[],
): GameDifficulty {
  return difficulties.includes(selected) ? selected : difficulties[difficulties.length - 1];
}
