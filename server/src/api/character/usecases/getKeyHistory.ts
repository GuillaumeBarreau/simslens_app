/**
 * Returns per-character key-run counts for a realm within a given week window,
 * plus the list of selectable weeks (Wed 05:00 Europe/Paris boundaries).
 */

import {
  getWowWeekStart,
  getWowWeekStartFor,
  listWowWeekStarts,
} from '../../../shared/utils/wowWeek';
import characterRepository from '../character.repository';

const HISTORY_SINCE = new Date('2026-04-01T00:00:00Z');
const MIN_KEY_LEVEL = 10;

export interface KeyHistoryInput {
  realmId: number;
  /** N'importe quel instant de la semaine voulue ; la semaine en cours par défaut. */
  weekStart?: Date;
  minLevel?: number;
}

export async function getKeyHistory({
  realmId,
  weekStart: requested,
  minLevel = MIN_KEY_LEVEL,
}: KeyHistoryInput) {
  const weeks = listWowWeekStarts(HISTORY_SINCE);

  const weekStart = requested ? getWowWeekStartFor(requested) : getWowWeekStart();
  const nextWeek = new Date(weekStart.getTime() + 7 * 86400000 + 3 * 3600000);
  const weekEnd = getWowWeekStartFor(nextWeek);

  const characters = await characterRepository.listKeyCountsForRealmRange(
    realmId,
    weekStart,
    weekEnd,
    minLevel,
  );

  return {
    weeks: weeks.map((d) => d.toISOString()),
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    minLevel,
    characters,
  };
}
