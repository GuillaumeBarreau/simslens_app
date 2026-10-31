/**
 * Flux iCal du joueur et fuseaux horaires (SIMS-204).
 *
 * L'application affiche toujours les heures dans le fuseau du navigateur :
 * les dates de l'API sont en UTC (ISO 8601) et dayjs les convertit à la
 * lecture. Le fuseau du royaume ne sert qu'aux messages Discord.
 */

/** Chemin du flux, relatif à la base de l'API. */
export const CALENDAR_FEED_PATH = '/1/events/calendar-feed';

/**
 * URL absolue du flux. La base de l'API peut être relative (proxy du même
 * domaine) : elle est alors résolue sur l'origine de la page, car l'agenda
 * qui s'abonne a besoin d'une URL complète.
 */
export function buildCalendarFeedUrl(
  apiBaseUrl: string | undefined,
  token: string,
  origin: string,
) {
  const base = (apiBaseUrl ?? '').replace(/\/+$/, '');
  const path = `${base}${CALENDAR_FEED_PATH}/${encodeURIComponent(token)}.ics`;

  return new URL(path, origin).toString();
}

/** Lien d'abonnement : `webcal://` ouvre directement l'agenda du système. */
export function toWebcalUrl(feedUrl: string): string {
  return feedUrl.replace(/^https?:\/\//, 'webcal://');
}

/** Fuseau IANA du navigateur (« Europe/Paris »). */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Fuseaux proposés quand le moteur ne fournit pas sa liste. */
const FALLBACK_TIME_ZONES = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Brussels',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Montreal',
  'Asia/Seoul',
  'Asia/Taipei',
  'Australia/Sydney',
  'UTC',
];

/**
 * Fuseaux sélectionnables : la liste du moteur Intl, augmentée du fuseau
 * courant s'il n'y figure pas (sans quoi le Select ne l'afficherait pas).
 */
export function timeZoneOptions(current?: string | null): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES;
  const zones = supported.includes('UTC') ? [...supported] : [...supported, 'UTC'];
  if (current && !zones.includes(current)) zones.push(current);

  return zones.sort((a, b) => a.localeCompare(b));
}
