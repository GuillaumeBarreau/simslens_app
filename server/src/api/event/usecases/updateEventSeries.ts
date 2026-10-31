/**
 * Modifie une série récurrente à partir d'une date (SIMS-200) : la série
 * elle-même, pour les occurrences encore à générer, et ses occurrences à venir
 * à partir de `fromDate`. Les occurrences passent par `eventService.updateEvent`,
 * comme une modification à la main : rappel réarmé si le raid recule, embed
 * Discord resynchronisé.
 *
 * Une seule occurrence se modifie par la route de l'événement (PUT /events/:id).
 */

import type { Prisma } from '@prisma/client';

import { EventSeriesFromDateNotGeneratedError } from '../event.errors';
import eventService from '../event.service';
import type { EventSeriesResult, UpdateEventInput, UpdateEventSeriesInput } from '../event.types';
import { findSeriesInRealm } from '../eventSeries.access';
import eventSeriesRepository from '../eventSeries.repository';
import { convertLocalTime, occurrenceTimes } from '../eventSeries.schedule';
import { generateSeriesOccurrences } from './generateSeriesOccurrences';

/** Champs d'une occurrence repris tels quels de la série. */
const COPIED_FIELDS = [
  'title',
  'description',
  'raidDifficultyId',
  'isOptional',
  'signupLockDisabled',
] as const;

/** Changements de la série à reporter sur une occurrence existante. */
export function occurrenceChanges(
  changes: Omit<UpdateEventSeriesInput, 'fromDate'>,
  series: { startTime: string; endTime: string; timezone: string },
  occurrenceDate: Date,
): UpdateEventInput {
  const eventChanges: UpdateEventInput = {};
  for (const field of COPIED_FIELDS) {
    if (changes[field] !== undefined) Object.assign(eventChanges, { [field]: changes[field] });
  }

  if (changes.startTime !== undefined || changes.endTime !== undefined) {
    const times = occurrenceTimes(
      occurrenceDate,
      changes.startTime ?? series.startTime,
      changes.endTime ?? series.endTime,
      series.timezone,
    );
    eventChanges.startTime = times.startTime;
    eventChanges.endTime = times.endTime;
  }
  return eventChanges;
}

export async function updateEventSeries(
  seriesId: number,
  realmId: number,
  input: UpdateEventSeriesInput,
  now: Date = new Date(),
): Promise<EventSeriesResult> {
  const current = await findSeriesInRealm(seriesId, realmId);
  const { fromDate, timezone: inputZone, ...requested } = input;

  // Les nouveaux paramètres ne valent qu'à partir de `fromDate` : la série ne
  // doit plus rien avoir à générer avant cette date, sinon les occurrences
  // intermédiaires les prendraient aussi.
  if (!current.generatedUntil || fromDate.getTime() > current.generatedUntil.getTime()) {
    throw new EventSeriesFromDateNotGeneratedError();
  }

  const changes = { ...requested };
  const zone = inputZone ?? current.timezone;
  if (changes.startTime !== undefined) {
    changes.startTime = convertLocalTime(fromDate, changes.startTime, zone, current.timezone);
  }
  if (changes.endTime !== undefined) {
    changes.endTime = convertLocalTime(fromDate, changes.endTime, zone, current.timezone);
  }

  const series = await eventSeriesRepository.update(
    current.id,
    changes as Prisma.raid_event_seriesUncheckedUpdateInput,
  );

  const occurrences = await eventSeriesRepository.findUpcomingOccurrences(
    current.id,
    fromDate,
    now,
  );
  let events = 0;
  for (const occurrence of occurrences) {
    if (!occurrence.seriesOccurrenceDate) continue;
    const eventChanges = occurrenceChanges(changes, current, occurrence.seriesOccurrenceDate);
    if (Object.keys(eventChanges).length === 0) continue;

    await eventService.updateEvent(occurrence.id, eventChanges, realmId);
    events++;
  }

  // Un horizon allongé (weeksAhead) se remplit tout de suite.
  await generateSeriesOccurrences(series, now);

  return { series, events };
}
