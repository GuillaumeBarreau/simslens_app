const upsertJobScheduler = vi.fn();
const queueClose = vi.fn();
const workerClose = vi.fn();
const workerOn = vi.fn();
const extendEventSeries = vi.fn();
const workerProcessors: Array<() => Promise<unknown>> = [];

vi.mock('bullmq', () => ({
  Queue: class {
    upsertJobScheduler = upsertJobScheduler;
    close = queueClose;
  },
  Worker: class {
    on = workerOn;
    close = workerClose;
    constructor(_name: string, processor: () => Promise<unknown>) {
      workerProcessors.push(processor);
    }
  },
}));
vi.mock('ioredis', () => ({
  default: class {
    quit = vi.fn().mockResolvedValue('OK');
  },
}));
vi.mock('../../api/event/usecases', () => ({
  extendEventSeries: (...a: unknown[]) => extendEventSeries(...a),
}));

import {
  closeEventSeriesJob,
  EVENT_SERIES_EVERY_MS,
  EVENT_SERIES_SCHEDULER_ID,
  processEventSeriesJob,
  startEventSeriesJob,
} from '../eventSeriesJob';

beforeEach(async () => {
  await closeEventSeriesJob();
  workerProcessors.length = 0;
  upsertJobScheduler.mockReset().mockResolvedValue({});
  extendEventSeries
    .mockReset()
    .mockResolvedValue({ skipped: false, series: 1, created: 2, failed: 0 });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('event series job', () => {
  it('registers a single hourly job scheduler under a fixed key', async () => {
    await startEventSeriesJob();
    expect(upsertJobScheduler).toHaveBeenCalledWith(
      EVENT_SERIES_SCHEDULER_ID,
      { every: EVENT_SERIES_EVERY_MS },
      expect.objectContaining({ name: 'extend' }),
    );
    expect(EVENT_SERIES_EVERY_MS).toBe(3_600_000);
  });

  it('starts only one worker per process', async () => {
    await startEventSeriesJob();
    await startEventSeriesJob();
    expect(workerProcessors).toHaveLength(1);
  });

  it('extends the series on each job', async () => {
    await startEventSeriesJob();
    await expect(workerProcessors[0]()).resolves.toMatchObject({ created: 2 });
    expect(extendEventSeries).toHaveBeenCalledTimes(1);
  });

  it('reports a skipped run', async () => {
    extendEventSeries.mockResolvedValueOnce({ skipped: true, series: 0, created: 0, failed: 0 });
    await expect(processEventSeriesJob()).resolves.toMatchObject({ skipped: true });
  });

  it('closes the worker and the queue', async () => {
    await startEventSeriesJob();
    await closeEventSeriesJob();
    expect(workerClose).toHaveBeenCalled();
    expect(queueClose).toHaveBeenCalled();
  });
});
