import dayjs from 'dayjs';
import type { RaidEvent } from 'services/event.service';
import type {
  CreateEventSeriesPayload,
  UpdateEventSeriesPayload,
} from 'services/eventSeries.service';

/** Raids récurrents (SIMS-200) : aides du formulaire de création / modification. */

export const DEFAULT_WEEKS_AHEAD = 4;
/** Même plafond que le serveur (event.validation.ts). */
export const MAX_WEEKS_AHEAD = 12;

/** Portée d'une modification sur un raid d'une série. */
export type SeriesScope = 'occurrence' | 'following';

/** Fuseau du navigateur : les horaires de la série s'y entendent, comme ceux du formulaire. */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
}

export function isSeriesOccurrence(event?: Pick<RaidEvent, 'seriesId'> | null): boolean {
  return !!event?.seriesId;
}

/**
 * Date du raid dans sa série (YYYY-MM-DD). Le serveur la renvoie en minuit UTC :
 * on en garde la partie date, sans conversion de fuseau qui la décalerait.
 */
export function occurrenceDateOf(event: Pick<RaidEvent, 'startTime' | 'seriesOccurrenceDate'>) {
  return event.seriesOccurrenceDate
    ? event.seriesOccurrenceDate.slice(0, 10)
    : dayjs(event.startTime).format('YYYY-MM-DD');
}

export interface SeriesFormValues {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  raidDifficultyId: string;
  weeksAhead: number;
  isOptional: boolean;
  defaultPresent: boolean;
  signupLockDisabled: boolean;
}

/** Série démarrant le jour sélectionné dans le calendrier. */
export function buildSeriesPayload(
  values: SeriesFormValues,
  firstDate: Date | dayjs.Dayjs,
  realmId: number,
  timezone: string = browserTimeZone(),
): CreateEventSeriesPayload {
  return {
    realmId,
    title: values.title,
    description: values.description || undefined,
    raidDifficultyId: values.raidDifficultyId ? parseInt(values.raidDifficultyId, 10) : undefined,
    startDate: dayjs(firstDate).format('YYYY-MM-DD'),
    startTime: values.startTime,
    endTime: values.endTime,
    timezone,
    weeksAhead: values.weeksAhead,
    isOptional: values.isOptional,
    defaultPresent: values.defaultPresent,
    signupLockDisabled: values.signupLockDisabled,
  };
}

/**
 * Modification « ce raid et les suivants ». Les horaires ne sont envoyés que
 * s'ils changent (sinon ils replaceraient aussi un raid suivant déplacé à la
 * main), avec le fuseau du navigateur où ils ont été saisis : le serveur les
 * convertit dans le fuseau de la série.
 */
export function buildSeriesUpdatePayload(
  event: Pick<RaidEvent, 'startTime' | 'endTime' | 'seriesOccurrenceDate'>,
  values: Omit<SeriesFormValues, 'weeksAhead' | 'defaultPresent'>,
  timezone: string = browserTimeZone(),
): UpdateEventSeriesPayload {
  const timesChanged =
    values.startTime !== dayjs(event.startTime).format('HH:mm') ||
    values.endTime !== dayjs(event.endTime).format('HH:mm');

  return {
    fromDate: occurrenceDateOf(event),
    title: values.title,
    description: values.description || undefined,
    raidDifficultyId: values.raidDifficultyId ? parseInt(values.raidDifficultyId, 10) : undefined,
    isOptional: values.isOptional,
    signupLockDisabled: values.signupLockDisabled,
    ...(timesChanged && { startTime: values.startTime, endTime: values.endTime, timezone }),
  };
}
