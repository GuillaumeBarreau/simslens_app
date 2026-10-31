/**
 * Job BullMQ qui prolonge les séries d'événements récurrents (SIMS-200).
 *
 * Un job scheduler BullMQ (clé fixe, donc unique même avec plusieurs
 * instances du serveur) produit un job par heure ; le premier part dès le
 * démarrage. Le worker traite un job à la fois. La génération elle-même est
 * idempotente (extendEventSeries) : un job rejoué ne crée pas de doublon.
 */

import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import { extendEventSeries } from '../api/event/usecases';

export const EVENT_SERIES_QUEUE = 'event-series';
export const EVENT_SERIES_SCHEDULER_ID = 'extend-event-series';
export const EVENT_SERIES_EVERY_MS = 60 * 60 * 1000;

let queue: Queue | null = null;
let worker: Worker | null = null;
let connections: Redis[] = [];

function createConnection(): Redis {
  const connection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380', 10),
    maxRetriesPerRequest: null,
  });
  connections.push(connection);
  return connection;
}

/** Traitement d'un job : un passage sur toutes les séries actives. */
export async function processEventSeriesJob() {
  const report = await extendEventSeries();
  if (report.skipped) {
    console.log('[EventSeries] Previous run still in progress, skipped.');
  } else {
    console.log(
      `[EventSeries] ${report.series} series checked, ${report.created} occurrence(s) created, ${report.failed} failure(s).`,
    );
  }
  return report;
}

export async function startEventSeriesJob(): Promise<void> {
  if (worker) return;

  queue = new Queue(EVENT_SERIES_QUEUE, { connection: createConnection() });
  worker = new Worker(EVENT_SERIES_QUEUE, processEventSeriesJob, {
    connection: createConnection(),
    concurrency: 1,
  });
  worker.on('failed', (job, err) => {
    console.error(`[EventSeries] Job ${job?.id} failed: ${err.message}`);
  });
  worker.on('error', (err) => {
    console.error('[EventSeries] Worker error:', err.message);
  });

  await queue.upsertJobScheduler(
    EVENT_SERIES_SCHEDULER_ID,
    { every: EVENT_SERIES_EVERY_MS },
    {
      name: 'extend',
      opts: { removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } },
    },
  );
  console.log('[EventSeries] Job scheduler armed (every hour).');
}

export async function closeEventSeriesJob(): Promise<void> {
  try {
    await worker?.close();
    await queue?.close();
    await Promise.all(connections.map((c) => c.quit().catch(() => undefined)));
  } catch (err) {
    console.error('[EventSeries] Error during close:', (err as Error).message);
  } finally {
    worker = null;
    queue = null;
    connections = [];
  }
}
