import { FOREVER_EXTENSION, type GameId } from 'config/games';
import { isValidExtension, WOW_EXTENSION } from 'config/seasonConfig';

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isSameGuild(routeGuild: string, guildName: string): boolean {
  return (
    safeDecode(routeGuild).normalize('NFC').toLocaleLowerCase() ===
    guildName.normalize('NFC').toLocaleLowerCase()
  );
}

/**
 * Extension de l'URL d'une guilde selon son jeu (SIMS-024) : `Forever` pour une
 * guilde Forever tant que l'extension est accessible (flag `forever`), sinon
 * l'extension Retail courante.
 */
export function extensionForGame(game?: GameId | null): string {
  if (game === 'forever' && isValidExtension(FOREVER_EXTENSION)) return FOREVER_EXTENSION;
  return WOW_EXTENSION;
}

export function realmHomePath(guildName: string, game?: GameId | null): string {
  return `/${encodeURIComponent(guildName)}/${extensionForGame(game)}/my-activity`;
}

export function pathInGuild(
  location: { pathname: string; search?: string; hash?: string },
  guildName: string,
  game?: GameId | null,
): string {
  const [, ...rest] = location.pathname.split('/').filter(Boolean);

  if (!rest.length || !isValidExtension(safeDecode(rest[0]))) {
    return realmHomePath(guildName, game);
  }

  return `/${encodeURIComponent(guildName)}/${rest.join('/')}${location.search ?? ''}${location.hash ?? ''}`;
}
