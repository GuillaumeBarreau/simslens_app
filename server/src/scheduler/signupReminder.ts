/**
 * Entête du premier rappel de raid (relance des joueurs sans réponse).
 *
 * L'heure de clôture des inscriptions est donnée dans le fuseau du royaume
 * (SIMS-204) : le serveur tourne en UTC, les joueurs non.
 */

import { formatDayTime, resolveTimeZone } from '../shared/utils/timeZone';

/** Clôture des inscriptions : `lockHours` heures avant le début du raid. */
export function signupLockTime(startTime: Date, lockHours: number): Date {
  return new Date(startTime.getTime() - lockHours * 3600 * 1000);
}

export function signupReminderHeadline(
  startTime: Date,
  lockHours: number,
  timeZone: string | null | undefined,
): string {
  const lockAt = formatDayTime(signupLockTime(startTime, lockHours), resolveTimeZone(timeZone));

  return `📢 **Inscriptions au raid bientôt fermées !** Clôture ${lockAt}.`;
}
