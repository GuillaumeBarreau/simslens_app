/**
 * Prolonge toutes les séries actives (SIMS-200) : appelé périodiquement par le
 * job BullMQ `event-series` (scheduler/eventSeriesJob.ts).
 */

import eventSeriesRepository from '../eventSeries.repository';
import { generateSeriesOccurrences } from './generateSeriesOccurrences';

export interface ExtendEventSeriesReport {
  /** Vrai si un passage était déjà en cours dans ce processus. */
  skipped: boolean;
  series: number;
  created: number;
  failed: number;
}

/**
 * Garde de réentrance : un passage lent (Discord) ne doit pas se superposer au
 * suivant dans le même processus. Entre processus, l'index unique des
 * occurrences suffit.
 */
let running = false;

export async function extendEventSeries(now: Date = new Date()): Promise<ExtendEventSeriesReport> {
  if (running) return { skipped: true, series: 0, created: 0, failed: 0 };
  running = true;

  try {
    const report: ExtendEventSeriesReport = { skipped: false, series: 0, created: 0, failed: 0 };
    for (const { id } of await eventSeriesRepository.findActive()) {
      try {
        // Relue juste avant d'être traitée : un officier a pu l'arrêter ou la
        // modifier pendant que le passage traitait les séries précédentes.
        const series = await eventSeriesRepository.findById(id);
        if (!series?.active) continue;

        report.series++;
        report.created += await generateSeriesOccurrences(series, now);
      } catch (error) {
        report.failed++;
        console.error(`[EventSeries] Series ${id}: extension failed:`, (error as Error).message);
      }
    }
    return report;
  } finally {
    running = false;
  }
}
