import { realmHomePath } from 'components/RequireRealm/realmPath';
import { DEFAULT_GAME, type GameId } from 'config/games';
import type { Realm } from 'types/realm';
import type { User } from 'types/user.types';

/** Préfixe de la clé `localStorage` de la dernière guilde visitée, une par jeu. */
export const LAST_GUILD_STORAGE_PREFIX = 'simslens_last_guild_';

const storageKey = (game: GameId) => `${LAST_GUILD_STORAGE_PREFIX}${game}`;

/** Dernière guilde visitée dans un jeu ; `null` si absente ou stockage indisponible. */
export function readLastGuild(game: GameId): string | null {
  try {
    const value = window.localStorage.getItem(storageKey(game));
    return value ? value : null;
  } catch {
    return null;
  }
}

/** Mémorise la guilde visitée pour ce jeu ; un stockage indisponible est ignoré. */
export function rememberLastGuild(game: GameId, guildName: string): void {
  if (!guildName) return;
  try {
    window.localStorage.setItem(storageKey(game), guildName);
  } catch {
    // Navigation privée, quota atteint : la mémorisation n'est qu'un confort.
  }
}

export interface UserGuild {
  guildName: string;
  game: GameId;
}

const sameName = (a: string, b: string) =>
  a.normalize('NFC').toLocaleLowerCase() === b.normalize('NFC').toLocaleLowerCase();

/**
 * Guildes de l'utilisateur, avec leur jeu : celle renvoyée par `/realms/check`,
 * celles qu'il a créées, celles de ses personnages et celles où il est invité.
 * Le jeu vient de la liste `GET /realms` ; une guilde absente de la liste est ignorée.
 */
export function collectUserGuilds(
  user: User | null | undefined,
  realms: readonly Realm[],
  checkedRealm?: Realm | null,
): UserGuild[] {
  if (!user) return [];

  const byId = new Map(realms.map((realm) => [realm.id, realm]));
  const found: Realm[] = [];
  const add = (realm?: Realm | null) => {
    if (realm && !found.some((r) => r.id === realm.id)) found.push(realm);
  };

  if (checkedRealm) add(byId.get(checkedRealm.id) ?? checkedRealm);

  const userId = Number(user.id);
  realms.filter((realm) => realm.createdBy === userId).forEach(add);

  for (const character of user.linkedCharacters ?? []) {
    const realmId = character.realmId == null ? undefined : Number(character.realmId);
    const byRealmId = realmId === undefined ? undefined : byId.get(realmId);
    const byGuildName = character.guildName
      ? realms.find((realm) => sameName(realm.guildName, character.guildName as string))
      : undefined;
    add(byRealmId ?? byGuildName);
  }

  for (const guest of user.guestRealms ?? []) add(byId.get(guest.id));

  return found.map((realm) => ({ guildName: realm.guildName, game: realm.game ?? DEFAULT_GAME }));
}

/** Page de création d'une guilde du jeu donné. */
export function createRealmPath(game: GameId): string {
  return game === DEFAULT_GAME ? '/create-realm' : `/create-realm?game=${game}`;
}

/**
 * Destination quand l'utilisateur choisit un jeu :
 * 1. la dernière guilde visitée dans ce jeu, si elle est toujours la sienne
 *    (ou si ses guildes n'ont pas pu être chargées) ;
 * 2. sinon la première de ses guildes dans ce jeu ;
 * 3. sinon la création d'une guilde de ce jeu.
 */
export function resolveGameDestination(
  game: GameId,
  lastGuild: string | null,
  userGuilds: readonly UserGuild[] | null,
): string {
  if (userGuilds === null) {
    return lastGuild ? realmHomePath(lastGuild, game) : createRealmPath(game);
  }

  const guildsOfGame = userGuilds.filter((guild) => guild.game === game);
  const remembered = lastGuild
    ? guildsOfGame.find((guild) => sameName(guild.guildName, lastGuild))
    : undefined;
  const target = remembered ?? guildsOfGame[0];

  return target ? realmHomePath(target.guildName, game) : createRealmPath(game);
}
