import { extendEventSeries } from '../usecases/extendEventSeries';

const findActive = vi.fn();
const findById = vi.fn();
const generateSeriesOccurrences = vi.fn();

vi.mock('../eventSeries.repository', () => ({
  default: {
    findActive: (...a: unknown[]) => findActive(...a),
    findById: (...a: unknown[]) => findById(...a),
  },
}));
vi.mock('../usecases/generateSeriesOccurrences', () => ({
  generateSeriesOccurrences: (...a: unknown[]) => generateSeriesOccurrences(...a),
}));

const now = new Date('2026-10-10T12:00:00Z');

beforeEach(() => {
  findActive.mockReset().mockResolvedValue([
    { id: 1, active: true, title: 'stale' },
    { id: 2, active: true, title: 'stale' },
  ]);
  findById.mockReset().mockImplementation(async (id: number) => ({ id, active: true }));
  generateSeriesOccurrences.mockReset().mockResolvedValue(2);
});

describe('extendEventSeries', () => {
  it('extends every active series, with its values read again', async () => {
    await expect(extendEventSeries(now)).resolves.toEqual({
      skipped: false,
      series: 2,
      created: 4,
      failed: 0,
    });
    expect(generateSeriesOccurrences).toHaveBeenCalledWith({ id: 1, active: true }, now);
    expect(generateSeriesOccurrences).toHaveBeenCalledWith({ id: 2, active: true }, now);
  });

  it('creates no occurrence for a series stopped during the run', async () => {
    // La série 2 est arrêtée pendant que le passage traite la série 1.
    generateSeriesOccurrences.mockImplementationOnce(async () => {
      findById.mockImplementation(async (id: number) => ({ id, active: id !== 2 }));
      return 2;
    });

    await expect(extendEventSeries(now)).resolves.toMatchObject({ series: 1, created: 2 });
    expect(generateSeriesOccurrences).toHaveBeenCalledTimes(1);
  });

  it('skips a series deleted during the run', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(extendEventSeries(now)).resolves.toMatchObject({ series: 1, created: 2 });
  });

  it('goes on with the other series when one fails', async () => {
    generateSeriesOccurrences.mockRejectedValueOnce(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(extendEventSeries(now)).resolves.toMatchObject({ created: 2, failed: 1 });
  });

  it('skips a run started while the previous one is still going', async () => {
    let release: (value: unknown[]) => void = () => undefined;
    findActive.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

    const first = extendEventSeries(now);
    await expect(extendEventSeries(now)).resolves.toMatchObject({ skipped: true });

    release([]);
    await expect(first).resolves.toMatchObject({ skipped: false });
    await expect(extendEventSeries(now)).resolves.toMatchObject({ skipped: false });
  });

  it('releases the guard after a failure', async () => {
    findActive.mockRejectedValueOnce(new Error('db down'));
    await expect(extendEventSeries(now)).rejects.toThrow('db down');
    await expect(extendEventSeries(now)).resolves.toMatchObject({ skipped: false });
  });
});
