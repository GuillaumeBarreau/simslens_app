/**
 * Fuseaux horaires (SIMS-204).
 *
 * Les heures sont stockées en UTC (`raid_events.startTime`). L'application les
 * affiche dans le fuseau du navigateur ; le serveur, qui n'en a pas, formate
 * les messages Discord dans le fuseau réglé sur le royaume (`realms.timezone`).
 */

/** Fuseau par défaut d'un royaume, et de repli pour une valeur invalide. */
export const DEFAULT_TIME_ZONE = 'Europe/Paris';

/**
 * Nom IANA reconnu par le moteur Intl (« Europe/Paris », « America/New_York »,
 * « UTC »). Pas de dépendance : `Intl.DateTimeFormat` lève une RangeError sur
 * un fuseau inconnu.
 */
export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== 'string' || timeZone.trim() === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Fuseau utilisable : celui donné s'il est valide, sinon le fuseau par défaut. */
export function resolveTimeZone(timeZone: string | null | undefined): string {
  return isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;
}

/** Jour et heure d'un instant dans un fuseau, par exemple « lundi 2 février à 20:00 ». */
export function formatDayTime(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);

  return `${day} à ${formatClockTime(date, timeZone)}`;
}

/** Heure « HH:mm » d'un instant dans un fuseau, par exemple « 21:00 ». */
export function formatClockTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
