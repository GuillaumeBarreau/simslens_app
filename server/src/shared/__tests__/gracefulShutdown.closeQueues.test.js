import { describe, expect, it, vi } from 'vitest';

const { closeQueues } = require('../gracefulShutdown');

describe('gracefulShutdown — closeQueues', () => {
  it('closes the queues in parallel', async () => {
    const order = [];
    let releaseReport;
    const report = () =>
      new Promise((resolve) => {
        order.push('report:start');
        releaseReport = () => {
          order.push('report:end');
          resolve();
        };
      });
    const series = async () => {
      order.push('series:start');
    };

    const closing = closeQueues([
      { name: 'report queue', close: report },
      { name: 'event series job', close: series },
    ]);
    // La seconde file commence à se fermer sans attendre la première.
    expect(order).toEqual(['report:start', 'series:start']);

    releaseReport();
    await closing;
    expect(order).toEqual(['report:start', 'series:start', 'report:end']);
  });

  it('still closes the other queues when one fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const series = vi.fn().mockResolvedValue(undefined);

    await expect(
      closeQueues([
        { name: 'report queue', close: () => Promise.reject(new Error('redis down')) },
        { name: 'event series job', close: series },
      ]),
    ).resolves.toBeUndefined();
    expect(series).toHaveBeenCalled();
  });
});
