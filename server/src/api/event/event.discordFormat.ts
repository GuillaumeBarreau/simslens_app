/**
 * Mise en forme d'un événement pour Discord.
 *
 * Trois formats indépendants : le nom du salon, le titre affiché dans
 * l'embed, et la date. Aucun n'accède à la base.
 *
 * La date et le nom du salon sont calculés dans le fuseau du royaume
 * (`realm.timezone`, SIMS-204) : le serveur tourne en UTC, les joueurs non.
 */

import { resolveTimeZone } from '../../shared/utils/timeZone';

/**
 * Acronymes retenus pour les raids dont les initiales ne conviennent pas.
 * Tout raid absent de cette table voit ses initiales calculées.
 */
export const RAID_ACRONYMS: Record<string, string> = {
  'manaforge omega': 'MFO',
  'the voidspire': 'TVS',
};

export interface EventForDiscord {
  startTime: Date | string;
  raid_difficulty?: {
    difficulty?: string | null;
    raid?: { name?: string | null } | null;
    difficulty_rel?: { name?: string | null } | null;
  } | null;
  /** Royaume de l'événement ; son fuseau IANA règle la date affichée. */
  realm?: { timezone?: string | null } | null;
}

/**
 * Fuseau de l'événement : celui du royaume (un fuseau invalide retombe sur
 * le fuseau par défaut). Sans royaume chargé, le fuseau du serveur, comme
 * avant SIMS-204.
 */
function timeZoneOf(event: EventForDiscord): string | undefined {
  const timeZone = event.realm?.timezone;
  return timeZone ? resolveTimeZone(timeZone) : undefined;
}

function raidNameOf(event: EventForDiscord): string {
  return event.raid_difficulty?.raid?.name || 'Raid';
}

function difficultyOf(event: EventForDiscord): string {
  return event.raid_difficulty?.difficulty_rel?.name || event.raid_difficulty?.difficulty || '';
}

function initialsOf(raidName: string): string {
  return raidName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * Nom du salon Discord : JJ-MM-AA-ACRONYME-DIFFICULTÉ,
 * par exemple « 02-02-26-MFO-MYTHIC ».
 */
export function formatChannelName(event: EventForDiscord): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: timeZoneOf(event),
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).formatToParts(new Date(event.startTime));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const dd = part('day');
  const mm = part('month');
  const yy = part('year');

  const raidName = raidNameOf(event);
  const acronym = RAID_ACRONYMS[raidName.toLowerCase()] ?? initialsOf(raidName);
  const difficulty = difficultyOf(event).toUpperCase().replace(/\s+/g, '-');

  return `${dd}-${mm}-${yy}-${acronym}-${difficulty}`;
}

/**
 * Titre affiché dans l'embed, par exemple « Nerub-ar Palace (Mythic) ».
 */
export function formatEventTitle(event: EventForDiscord): string {
  const difficulty = difficultyOf(event);

  return `${raidNameOf(event)}${difficulty ? ` (${difficulty})` : ''}`;
}

/**
 * Date de l'événement, en français, sous deux formes : courte pour l'entête
 * et complète pour le corps. Dans le fuseau du royaume.
 */
export function formatEventDate(event: EventForDiscord): {
  dateStr: string;
  startTime: string;
} {
  const date = new Date(event.startTime);
  const timeZone = timeZoneOf(event);

  return {
    dateStr: date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone,
    }),
    startTime: date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone }),
  };
}
