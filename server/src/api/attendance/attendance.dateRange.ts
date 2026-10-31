import {
  DateRangeTooLargeError,
  InvalidDateError,
  InvalidDateOrderError,
} from './attendance.errors';
import type { DateRange } from './attendance.types';

/** Amplitude maximale d'une période interrogeable, en jours. */
export const MAX_RANGE_DAYS = 366;

/** Profondeur par défaut quand l'appelant ne borne pas la période. */
export const DEFAULT_RANGE_DAYS = 30;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(value: Date | string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidDateError();
  }

  return parsed;
}

/**
 * @param enforceMaxSpan plafonne l'amplitude — appliqué au résumé du
 *   royaume, qui agrège tous les personnages, mais pas au détail d'un seul
 *   personnage dont le volume reste borné.
 */
export function resolveDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  { enforceMaxSpan = false }: { enforceMaxSpan?: boolean } = {},
): DateRange {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - DEFAULT_RANGE_DAYS);

  const start = parseDate(startDate, defaultStart);
  const end = parseDate(endDate, now);

  if (start > end) {
    throw new InvalidDateOrderError();
  }

  if (enforceMaxSpan) {
    const spanDays = (end.getTime() - start.getTime()) / MS_PER_DAY;
    if (spanDays > MAX_RANGE_DAYS) {
      throw new DateRangeTooLargeError(MAX_RANGE_DAYS);
    }
  }

  return { startDate: start, endDate: end };
}
