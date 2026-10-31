/**
 * Arrête une série récurrente à partir d'une date (SIMS-200) : plus aucune
 * occurrence n'est générée à partir de `fromDate`, et celles déjà créées et à
 * venir sont annulées par `eventService.cancelEvent`, comme une suppression à
 * la main (salon Discord supprimé). Les occurrences passées restent, avec leurs
 * présences.
 *
 * Une seule occurrence se supprime par la route de l'événement
 * (DELETE /events/:id) ; la série ne la recrée pas.
 */

import eventService from '../event.service';
import type { EventSeriesResult } from '../event.types';
import { findSeriesInRealm } from '../eventSeries.access';
import eventSeriesRepository from '../eventSeries.repository';
import { addDays } from '../eventSeries.schedule';

export async function deleteEventSeries(
  seriesId: number,
  realmId: number,
  fromDate: Date,
  now: Date = new Date(),
): Promise<EventSeriesResult> {
  const current = await findSeriesInRealm(seriesId, realmId);

  // Arrêtée dès sa première date : la série n'a plus lieu d'être active.
  const endsBeforeStart = fromDate.getTime() <= current.startsOn.getTime();
  // Un second arrêt, plus tardif, ne repousse pas une fin déjà fixée.
  const requestedEnd = addDays(fromDate, -1);
  const endsOn =
    current.endsOn && current.endsOn.getTime() < requestedEnd.getTime()
      ? current.endsOn
      : requestedEnd;
  const series = await eventSeriesRepository.update(
    current.id,
    endsBeforeStart ? { active: false } : { endsOn },
  );

  const occurrences = await eventSeriesRepository.findUpcomingOccurrences(
    current.id,
    fromDate,
    now,
  );
  for (const occurrence of occurrences) {
    await eventService.cancelEvent(occurrence.id, realmId);
  }

  return { series, events: occurrences.length };
}
