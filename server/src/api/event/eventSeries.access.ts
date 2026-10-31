import { EventSeriesNotAccessibleError } from './event.errors';
import type { EventSeriesEntity } from './event.types';
import eventSeriesRepository from './eventSeries.repository';

/**
 * Charge la série :seriesId et la rattache au royaume vérifié par
 * checkPermission. checkPermission ne connaît pas les séries : sans ce
 * contrôle, un officier d'une guilde modifierait la série d'une autre en
 * passant ?realmId=<sa guilde>.
 *
 * @throws {EventSeriesNotAccessibleError} si la série n'existe pas ou sort du royaume
 */
export async function findSeriesInRealm(
  seriesId: number,
  realmId: number,
): Promise<EventSeriesEntity> {
  const series = await eventSeriesRepository.findById(seriesId);
  if (!series || series.realmId !== realmId) {
    throw new EventSeriesNotAccessibleError();
  }
  return series;
}
