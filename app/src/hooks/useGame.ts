import type { GameCapability, GameDefinition, GameId } from 'config/games';
import { gameHasCapability, getGameDefinition, getGameForExtension } from 'config/games';
import { useCallback, useMemo } from 'react';

import { useRouteParams } from './useRouteParams';

export interface UseGameResult {
  game: GameId;
  definition: GameDefinition;
  has: (capability: GameCapability) => boolean;
}

/** Jeu courant, déduit de l'extension de l'URL (extension inconnue → Retail). */
export const useGame = (): UseGameResult => {
  const { extension } = useRouteParams();
  const game = getGameForExtension(extension);

  const has = useCallback(
    (capability: GameCapability) => gameHasCapability(game, capability),
    [game],
  );

  return useMemo(() => ({ game, definition: getGameDefinition(game), has }), [game, has]);
};
