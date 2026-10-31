/**
 * Contenu du flux iCal d'un joueur : soirées de ses royaumes et statut
 * d'inscription de ses personnages. Fonctions pures, sans base.
 */

import type { ICalEvent } from './calendar_feed.ical';
import type { FeedCharacter, FeedEventRow, FeedSignupRow } from './calendar_feed.types';

/** Libellés des statuts d'inscription, repris de l'application (calendar.json). */
export const SIGNUP_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  TENTATIVE: 'Incertain',
  LATE: 'En retard',
  BENCH: 'Remplaçant',
};

export const NOT_SIGNED_UP_LABEL = 'Pas encore inscrit';

/** Domaine des UID : stable, pour que le client mette à jour plutôt que dupliquer. */
const UID_DOMAIN = 'droptimizer';

/** Royaumes du joueur : ceux de ses personnages, ceux qu'il gère et ceux où il est invité. */
export function feedRealmIds(characters: FeedCharacter[], otherRealmIds: number[]): number[] {
  return [...new Set([...characters.map((c) => c.realmId), ...otherRealmIds])].sort(
    (a, b) => a - b,
  );
}

function signupLabel(signup: FeedSignupRow): string {
  const label = SIGNUP_STATUS_LABELS[signup.status] ?? signup.status;
  return signup.status === 'LATE' && signup.lateTime ? `${label} (${signup.lateTime})` : label;
}

/**
 * Statut du joueur pour une soirée : une entrée par personnage inscrit, ou
 * « pas encore inscrit » s'il a un personnage dans le royaume. Null pour un
 * royaume où il n'a aucun personnage (officier, invité).
 *
 * Comme le roster de l'événement, seules comptent les inscriptions des
 * personnages du royaume de la soirée.
 */
export function signupSummary(
  event: FeedEventRow,
  signups: FeedSignupRow[],
  characters: FeedCharacter[],
): { short: string; detail: string } | null {
  const mine = playerSignups(event, signups, characters);
  if (mine.length > 0) {
    const labels = [...new Set(mine.map(signupLabel))];
    return {
      short: labels.join(' / '),
      detail: mine.map((s) => `${signupLabel(s)} (${s.character.name})`).join(', '),
    };
  }
  if (characters.some((c) => c.realmId === event.realmId)) {
    return { short: NOT_SIGNED_UP_LABEL, detail: NOT_SIGNED_UP_LABEL };
  }

  return null;
}

/**
 * Inscriptions du joueur à une soirée : celles de ses personnages du royaume
 * de la soirée, comme le roster de l'événement.
 */
function playerSignups(
  event: FeedEventRow,
  signups: FeedSignupRow[],
  characters: FeedCharacter[],
): FeedSignupRow[] {
  const realmCharacterIds = new Set(
    characters.filter((c) => c.realmId === event.realmId).map((c) => c.id),
  );
  return signups.filter((s) => s.eventId === event.id && realmCharacterIds.has(s.characterId));
}

/** Origine de SEQUENCE : les révisions sont des secondes écoulées depuis cette date. */
const SEQUENCE_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * Dernière modification visible dans le flux : celle de la soirée ou d'une
 * inscription du joueur (le statut fait partie du titre). SEQUENCE en est
 * dérivée, pour croître à chaque modification sans compteur stocké.
 */
export function revisionOf(
  event: FeedEventRow,
  signups: FeedSignupRow[],
  characters: FeedCharacter[],
): { lastModified: Date; sequence: number } {
  const lastModifiedMs = Math.max(
    event.updatedAt.getTime(),
    ...playerSignups(event, signups, characters).map((s) => s.updatedAt.getTime()),
  );

  return {
    lastModified: new Date(lastModifiedMs),
    sequence: Math.max(0, Math.floor((lastModifiedMs - SEQUENCE_EPOCH_MS) / 1000)),
  };
}

/** Une soirée en VEVENT : titre suivi du statut, guilde et statut détaillés en description. */
export function toICalEvent(
  event: FeedEventRow,
  signups: FeedSignupRow[],
  characters: FeedCharacter[],
  now: Date,
): ICalEvent {
  const summary = signupSummary(event, signups, characters);
  const description = [
    `Guilde : ${event.realm.guildName}`,
    summary ? `Inscription : ${summary.detail}` : null,
    event.isOptional ? 'Soirée facultative' : null,
    event.description ? `\n${event.description}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    uid: `raid-event-${event.id}@${UID_DOMAIN}`,
    start: event.startTime,
    end: event.endTime,
    stamp: now,
    summary: summary ? `${event.title} [${summary.short}]` : event.title,
    description,
    status: event.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED',
    ...revisionOf(event, signups, characters),
  };
}
