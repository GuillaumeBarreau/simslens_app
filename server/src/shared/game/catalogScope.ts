/**
 * Portée du catalogue d'un jeu (SIMS-027) : les saisons dont le contenu (raids, boss,
 * objets) reste pertinent. Voir docs/forever/README.md §7.2.
 *
 * - Retail : seule la saison courante compte, la suivante remplace la précédente.
 * - Forever : la progression est cumulative, un palier n'efface pas le précédent
 *   (un objet du palier 1 peut rester BiS au palier 2) : tous les paliers du
 *   registre jusqu'au courant inclus.
 */

import type { GameId } from './games';
import { GAMES } from './games';

export interface CatalogScope {
  game: GameId;
  /** Valeurs de `extension` du jeu. */
  extensions: readonly string[];
  /** Valeurs de `season` couvertes, dans l'ordre du registre. */
  seasons: readonly string[];
}

/**
 * Saisons couvertes par le catalogue quand `currentSeason` est la saison courante.
 *
 * @throws {Error} pour un jeu à paliers, si `currentSeason` n'est pas un palier du
 *   registre : sans ordre connu, la portée ne peut pas être calculée.
 */
export function catalogSeasons(game: GameId, currentSeason: string): string[] {
  return seasonsUpTo(GAMES[game].seasons, currentSeason);
}

/**
 * Règle sous-jacente : sans liste ordonnée de paliers (`null`, Retail), la saison
 * courante seule ; sinon les paliers jusqu'au courant inclus.
 */
export function seasonsUpTo(tiers: readonly string[] | null, currentSeason: string): string[] {
  if (tiers === null) return [currentSeason];

  const index = tiers.indexOf(currentSeason);
  if (index === -1) {
    throw new Error(`Unknown tier "${currentSeason}": expected one of ${tiers.join(', ')}`);
  }
  return tiers.slice(0, index + 1);
}

export function catalogScope(game: GameId, currentSeason: string): CatalogScope {
  return {
    game,
    extensions: GAMES[game].extensions,
    seasons: catalogSeasons(game, currentSeason),
  };
}
