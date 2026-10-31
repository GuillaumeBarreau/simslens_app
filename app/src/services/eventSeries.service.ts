import { apiClient } from './api.client';

/** Série de raids récurrents : le serveur en génère les occurrences (SIMS-200). */
export interface EventSeries {
  id: number;
  realmId: number;
  title: string;
  description?: string | null;
  raidDifficultyId?: number | null;
  /** 0 = dimanche … 6 = samedi. */
  dayOfWeek: number;
  /** Horaires locaux "HH:mm", dans le fuseau `timezone`. */
  startTime: string;
  endTime: string;
  timezone: string;
  weeksAhead: number;
  isOptional: boolean;
  defaultPresent: boolean;
  signupLockDisabled: boolean;
  active: boolean;
  startsOn: string;
  endsOn?: string | null;
  generatedUntil?: string | null;
}

export interface CreateEventSeriesPayload {
  realmId: number;
  title: string;
  description?: string;
  raidDifficultyId?: number;
  /** Date de la première occurrence (YYYY-MM-DD) : elle fixe le jour de la semaine. */
  startDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  weeksAhead: number;
  isOptional?: boolean;
  defaultPresent?: boolean;
  signupLockDisabled?: boolean;
}

export interface UpdateEventSeriesPayload {
  /** Les raids de la série à partir de cette date (YYYY-MM-DD) reprennent les changements. */
  fromDate: string;
  title?: string;
  description?: string;
  raidDifficultyId?: number;
  startTime?: string;
  endTime?: string;
  /** Fuseau de saisie des horaires : le serveur les convertit dans celui de la série. */
  timezone?: string;
  weeksAhead?: number;
  isOptional?: boolean;
  signupLockDisabled?: boolean;
}

export interface EventSeriesResult {
  series: EventSeries;
  /** Raids créés, modifiés ou annulés par l'opération. */
  events: number;
}

class EventSeriesService {
  async create(payload: CreateEventSeriesPayload): Promise<EventSeriesResult> {
    const { data } = await apiClient.post(`/1/events/series?realmId=${payload.realmId}`, payload);
    return data;
  }

  async update(
    seriesId: number,
    realmId: number,
    payload: UpdateEventSeriesPayload,
  ): Promise<EventSeriesResult> {
    const { data } = await apiClient.put(
      `/1/events/series/${seriesId}?realmId=${realmId}`,
      payload,
    );
    return data;
  }

  /** Arrête la série à partir de `fromDate` et annule ses raids à venir. */
  async remove(seriesId: number, realmId: number, fromDate: string): Promise<EventSeriesResult> {
    const { data } = await apiClient.delete(
      `/1/events/series/${seriesId}?realmId=${realmId}&fromDate=${fromDate}`,
    );
    return data;
  }
}

export const eventSeriesService = new EventSeriesService();
