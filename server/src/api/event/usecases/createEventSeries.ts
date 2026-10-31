/**
 * Crée une série d'événements récurrents (SIMS-200) et ses premières
 * occurrences, sans attendre le passage du job.
 */

import type { CreateEventSeriesInput, EventSeriesResult } from '../event.types';
import eventSeriesRepository from '../eventSeries.repository';
import { generateSeriesOccurrences } from './generateSeriesOccurrences';

/**
 * @param realmId royaume vérifié par checkPermission, jamais celui du corps
 * @param userId officier créateur, repris comme auteur de chaque occurrence
 */
export async function createEventSeries(
  input: CreateEventSeriesInput,
  realmId: number,
  userId: string,
  now: Date = new Date(),
): Promise<EventSeriesResult> {
  const series = await eventSeriesRepository.create({
    realmId,
    title: input.title,
    description: input.description ?? null,
    raidDifficultyId: input.raidDifficultyId ?? null,
    dayOfWeek: input.startDate.getUTCDay(),
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone,
    weeksAhead: input.weeksAhead,
    isOptional: input.isOptional ?? false,
    defaultPresent: input.defaultPresent ?? false,
    signupLockDisabled: input.signupLockDisabled ?? false,
    startsOn: input.startDate,
    createdBy: String(userId),
  });

  const events = await generateSeriesOccurrences(series, now);
  const generated = await eventSeriesRepository.findById(series.id);
  return { series: generated ?? series, events };
}
