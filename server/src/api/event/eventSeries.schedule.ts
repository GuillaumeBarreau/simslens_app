/**
 * Calendrier d'une série d'événements récurrents (SIMS-200) : fonctions pures,
 * testées sans base.
 *
 * Une série est définie en heure locale (« le mercredi à 21:00, Europe/Paris »),
 * les événements en base en instants UTC. Une date d'occurrence est représentée
 * par un `Date` à minuit UTC (colonne Postgres `DATE`).
 */

const DAY_MS = 86_400_000;

/** Horaire local "HH:mm" (00:00 à 23:59). */
export const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Date "YYYY-MM-DD" → minuit UTC ; `null` si la date n'existe pas (2026-02-30). */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Fuseau IANA reconnu par le moteur (`Europe/Paris`, `America/New_York`…). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Date et heure murales de `instant` dans `timeZone`, exprimées comme un instant UTC. */
function wallClockAsUtc(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
}

/** Décalage du fuseau à cet instant, en millisecondes (Paris en été : +2 h). */
function offsetAt(instant: Date, timeZone: string): number {
  const whole = new Date(Math.floor(instant.getTime() / 1000) * 1000);
  return wallClockAsUtc(whole, timeZone) - whole.getTime();
}

/** Date locale (minuit UTC) de `instant` dans `timeZone`. */
export function localDateOf(instant: Date, timeZone: string): Date {
  const wall = new Date(wallClockAsUtc(instant, timeZone));
  return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));
}

/**
 * Instant UTC de l'heure locale `time` le jour `date` dans `timeZone`.
 * Deux passes suffisent pour tomber sur le bon décalage autour d'un changement
 * d'heure ; une heure qui n'existe pas (saut de printemps) est décalée d'autant.
 */
export function zonedTimeToUtc(date: Date, time: string, timeZone: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const wall = date.getTime() + (hours * 60 + minutes) * 60_000;

  const guess = wall - offsetAt(new Date(wall), timeZone);
  return new Date(wall - offsetAt(new Date(guess), timeZone));
}

/**
 * Heure locale "HH:mm" saisie dans `fromZone` le jour `date`, exprimée dans
 * `toZone` (ex. 21:00 à Londres → 22:00 à Paris).
 */
export function convertLocalTime(
  date: Date,
  time: string,
  fromZone: string,
  toZone: string,
): string {
  if (fromZone === toZone) return time;
  const wall = new Date(wallClockAsUtc(zonedTimeToUtc(date, time, fromZone), toZone));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`;
}

/**
 * Début et fin d'une occurrence. Une fin à une heure inférieure ou égale au
 * début tombe le lendemain (raid de 23:00 à 01:00).
 */
export function occurrenceTimes(
  date: Date,
  startTime: string,
  endTime: string,
  timeZone: string,
): { startTime: Date; endTime: Date } {
  const endDate = endTime <= startTime ? addDays(date, 1) : date;
  return {
    startTime: zonedTimeToUtc(date, startTime, timeZone),
    endTime: zonedTimeToUtc(endDate, endTime, timeZone),
  };
}

/** Première date de jour `dayOfWeek` (0 = dimanche) à partir de `date` incluse. */
export function nextWeekday(date: Date, dayOfWeek: number): Date {
  return addDays(date, (dayOfWeek - date.getUTCDay() + 7) % 7);
}

export interface SeriesWindow {
  dayOfWeek: number;
  weeksAhead: number;
  startsOn: Date;
  endsOn: Date | null;
  generatedUntil: Date | null;
}

/**
 * Dates des occurrences à créer : le jour de la série, après la dernière date
 * déjà traitée, à partir d'aujourd'hui et pendant `weeksAhead` semaines, sans
 * dépasser la fin de la série.
 */
export function plannedOccurrenceDates(series: SeriesWindow, today: Date): Date[] {
  let from = series.startsOn.getTime() > today.getTime() ? series.startsOn : today;
  if (series.generatedUntil && series.generatedUntil.getTime() >= from.getTime()) {
    from = addDays(series.generatedUntil, 1);
  }

  const horizon = addDays(today, series.weeksAhead * 7);
  const end =
    series.endsOn && addDays(series.endsOn, 1).getTime() < horizon.getTime()
      ? addDays(series.endsOn, 1)
      : horizon;

  const dates: Date[] = [];
  for (
    let d = nextWeekday(from, series.dayOfWeek);
    d.getTime() < end.getTime();
    d = addDays(d, 7)
  ) {
    dates.push(d);
  }
  return dates;
}
