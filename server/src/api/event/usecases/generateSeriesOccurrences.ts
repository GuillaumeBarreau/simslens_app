/**
 * Génère les occurrences à venir d'une série récurrente (SIMS-200).
 *
 * Chaque occurrence passe par `eventService.createEvent`, comme un événement
 * créé à la main : absences reportées, « tous présents », salon et annonce
 * Discord. Le verrou des inscriptions et les rappels se calculent ensuite sur
 * l'événement lui-même, sans rien de propre aux séries.
 *
 * Idempotent : `generatedUntil` retient la dernière date traitée (une
 * occurrence supprimée n'est jamais recréée), et l'index unique
 * (seriesId, seriesOccurrenceDate) écarte le doublon de deux exécutions
 * concurrentes avant tout appel à Discord.
 */

import eventService from '../event.service';
import type { CreateSeriesOccurrenceInput, EventSeriesEntity } from '../event.types';
import eventSeriesRepository from '../eventSeries.repository';
import { localDateOf, occurrenceTimes, plannedOccurrenceDates } from '../eventSeries.schedule';

/** Violation de contrainte unique Prisma : l'occurrence existe déjà. */
function isAlreadyCreated(error: unknown): boolean {
  return (error as { code?: string })?.code === 'P2002';
}

export async function generateSeriesOccurrences(
  series: EventSeriesEntity,
  now: Date = new Date(),
): Promise<number> {
  if (!series.active) return 0;

  const dates = plannedOccurrenceDates(series, localDateOf(now, series.timezone));
  let generatedUntil = series.generatedUntil;
  let created = 0;

  for (const date of dates) {
    const times = occurrenceTimes(date, series.startTime, series.endTime, series.timezone);

    // Une occurrence déjà commencée (job arrêté, série créée en soirée) est sautée.
    if (times.startTime.getTime() > now.getTime()) {
      const occurrence: CreateSeriesOccurrenceInput = {
        realmId: series.realmId,
        title: series.title,
        description: series.description,
        startTime: times.startTime,
        endTime: times.endTime,
        raidDifficultyId: series.raidDifficultyId,
        isOptional: series.isOptional,
        defaultPresent: series.defaultPresent,
        signupLockDisabled: series.signupLockDisabled,
        seriesId: series.id,
        seriesOccurrenceDate: date,
      };
      try {
        await eventService.createEvent(occurrence, series.createdBy);
        created++;
      } catch (error) {
        if (!isAlreadyCreated(error)) {
          // On garde la date pour la réessayer au prochain passage.
          console.error(
            `[EventSeries] Series ${series.id}: failed to create the ${date.toISOString().slice(0, 10)} occurrence:`,
            (error as Error).message,
          );
          break;
        }
      }
    }
    generatedUntil = date;
  }

  if (generatedUntil !== series.generatedUntil) {
    await eventSeriesRepository.update(series.id, { generatedUntil });
  }
  return created;
}
