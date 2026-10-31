import type { EventStatus, raid_event_series, raid_events } from '@prisma/client';

export type EventEntity = raid_events;
export type EventSeriesEntity = raid_event_series;
export type { EventStatus };

export interface ListEventsFilters {
  realmId: EventEntity['realmId'];
  startDate?: Date;
  endDate?: Date;
  status?: EventStatus;
}

export interface CreateEventInput {
  realmId: EventEntity['realmId'];
  title: EventEntity['title'];
  description?: EventEntity['description'];
  startTime: Date;
  endTime: Date;
  raidDifficultyId?: EventEntity['raidDifficultyId'];
  status?: EventStatus;
  isOptional?: boolean;
  /** Inscrit d'office tout le roster actif comme présent. */
  defaultPresent?: boolean;
  signupLockDisabled?: boolean;
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'realmId'>>;

/** Occurrence d'une série : l'événement garde le lien vers sa série (SIMS-200). */
export interface CreateSeriesOccurrenceInput extends CreateEventInput {
  seriesId: number;
  seriesOccurrenceDate: Date;
}

/** Champs d'une série repris par chaque occurrence. */
interface EventSeriesTemplate {
  title: string;
  description?: string | null;
  raidDifficultyId?: number | null;
  /** Horaires locaux "HH:mm". */
  startTime: string;
  endTime: string;
  weeksAhead: number;
  isOptional?: boolean;
  defaultPresent?: boolean;
  signupLockDisabled?: boolean;
}

export interface CreateEventSeriesInput extends EventSeriesTemplate {
  /** Date de la première occurrence ; elle fixe le jour de la semaine. */
  startDate: Date;
  /** Fuseau IANA dans lequel s'entendent les horaires. */
  timezone: string;
}

export interface UpdateEventSeriesInput extends Partial<EventSeriesTemplate> {
  /** Les occurrences à venir à partir de cette date reprennent les changements. */
  fromDate: Date;
  /**
   * Fuseau dans lequel `startTime` / `endTime` ont été saisis (celui du
   * navigateur) ; ils sont convertis dans le fuseau de la série.
   */
  timezone?: string;
}

export interface EventSeriesResult {
  series: EventSeriesEntity;
  /** Occurrences créées, modifiées ou annulées par l'opération. */
  events: number;
}

export interface DuplicateEventOptions {
  title?: string;
  /** Reprend les inscriptions de l'événement source. */
  copySignups?: boolean;
}
