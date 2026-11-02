/**
 * Namespace des appels à l'API Blizzard (SIMS-020).
 *
 * Seul endroit où se construit le paramètre `namespace` : `profile-eu`, `static-eu`…
 * pour Retail ; pour un autre jeu, le suffixe vient du registre (`games.ts`).
 */

import { DEFAULT_GAME, type GameId, GAMES } from './games';

/** profile : personnages, guildes ; static : données de jeu ; dynamic : données de jeu variables. */
export type BlizzardNamespaceKind = 'profile' | 'static' | 'dynamic';

/**
 * La région est reprise telle quelle : chaque appelant la normalise déjà (minuscules)
 * comme il le faisait avant ce module.
 *
 * Retourne `null` si le jeu n'a pas d'API Blizzard : l'appelant ne doit pas faire
 * l'appel.
 */
export function blizzardNamespace(
  kind: BlizzardNamespaceKind,
  region: string,
  game?: 'retail',
): string;
export function blizzardNamespace(
  kind: BlizzardNamespaceKind,
  region: string,
  game: GameId,
): string | null;
export function blizzardNamespace(
  kind: BlizzardNamespaceKind,
  region: string,
  game: GameId = DEFAULT_GAME,
): string | null {
  const suffix = GAMES[game].blizzardNamespaceSuffix;
  if (suffix === null) return null;
  return suffix ? `${kind}-${suffix}-${region}` : `${kind}-${region}`;
}
