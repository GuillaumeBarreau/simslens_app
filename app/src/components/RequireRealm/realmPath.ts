import { VALID_EXTENSIONS, WOW_EXTENSION } from 'config/seasonConfig';

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

export function realmHomePath(guildName: string): string {
  return `/${encodeURIComponent(guildName)}/${WOW_EXTENSION}/my-activity`;
}

export function pathInGuild(
  location: { pathname: string; search?: string; hash?: string },
  guildName: string,
): string {
  const [, ...rest] = location.pathname.split('/').filter(Boolean);

  if (!rest.length || !VALID_EXTENSIONS.includes(safeDecode(rest[0]))) {
    return realmHomePath(guildName);
  }

  return `/${encodeURIComponent(guildName)}/${rest.join('/')}${location.search ?? ''}${location.hash ?? ''}`;
}
