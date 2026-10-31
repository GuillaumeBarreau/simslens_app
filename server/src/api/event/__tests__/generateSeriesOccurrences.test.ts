import type { EventSeriesEntity } from '../event.types';
import { generateSeriesOccurrences } from '../usecases/generateSeriesOccurrences';

const createEvent = vi.fn();
const update = vi.fn();

vi.mock('../event.service', () => ({
  default: { createEvent: (...a: unknown[]) => createEvent(...a) },
}));
vi.mock('../eventSeries.repository', () => ({
  default: { update: (...a: unknown[]) => update(...a) },
}));

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Série du mercredi (2026-10-14) à 21:00 heure de Paris, deux semaines d'avance.
const series = {
  id: 9,
  realmId: 3,
  title: 'Manaforge - Heroic',
  description: null,
  raidDifficultyId: 5,
  dayOfWeek: 3,
  startTime: '21:00',
  endTime: '23:30',
  timezone: 'Europe/Paris',
  weeksAhead: 2,
  isOptional: false,
  defaultPresent: true,
  signupLockDisabled: false,
  active: true,
  startsOn: day('2026-10-14'),
  endsOn: null,
  generatedUntil: null,
  createdBy: '42',
  createdAt: new Date(),
  updatedAt: new Date(),
} as EventSeriesEntity;

const saturday = new Date('2026-10-10T12:00:00Z');

beforeEach(() => {
  createEvent.mockReset().mockResolvedValue({ id: 100 });
  update.mockReset().mockResolvedValue(series);
});

describe('generateSeriesOccurrences', () => {
  it('creates each planned occurrence like a manual event, linked to its series', async () => {
    await expect(generateSeriesOccurrences(series, saturday)).resolves.toBe(2);

    expect(createEvent).toHaveBeenCalledTimes(2);
    expect(createEvent).toHaveBeenNthCalledWith(
      1,
      {
        realmId: 3,
        title: 'Manaforge - Heroic',
        description: null,
        startTime: new Date('2026-10-14T19:00:00Z'),
        endTime: new Date('2026-10-14T21:30:00Z'),
        raidDifficultyId: 5,
        isOptional: false,
        defaultPresent: true,
        signupLockDisabled: false,
        seriesId: 9,
        seriesOccurrenceDate: day('2026-10-14'),
      },
      '42',
    );
    expect(createEvent.mock.calls[1][0].seriesOccurrenceDate).toEqual(day('2026-10-21'));
  });

  it('remembers the last date handled', async () => {
    await generateSeriesOccurrences(series, saturday);
    expect(update).toHaveBeenCalledWith(9, { generatedUntil: day('2026-10-21') });
  });

  it('does nothing for an inactive series', async () => {
    await expect(generateSeriesOccurrences({ ...series, active: false }, saturday)).resolves.toBe(
      0,
    );
    expect(createEvent).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('skips an occurrence that has already started, but counts it as handled', async () => {
    const duringRaid = new Date('2026-10-14T20:00:00Z');
    await expect(generateSeriesOccurrences(series, duringRaid)).resolves.toBe(1);

    expect(createEvent).toHaveBeenCalledTimes(1);
    expect(createEvent.mock.calls[0][0].seriesOccurrenceDate).toEqual(day('2026-10-21'));
    expect(update).toHaveBeenCalledWith(9, { generatedUntil: day('2026-10-21') });
  });

  it('treats an occurrence created by a concurrent run as handled', async () => {
    createEvent.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));

    await expect(generateSeriesOccurrences(series, saturday)).resolves.toBe(1);
    expect(update).toHaveBeenCalledWith(9, { generatedUntil: day('2026-10-21') });
  });

  it('stops on a failure and keeps the failed date for the next run', async () => {
    createEvent.mockResolvedValueOnce({ id: 100 }).mockRejectedValueOnce(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(generateSeriesOccurrences(series, saturday)).resolves.toBe(1);
    expect(update).toHaveBeenCalledWith(9, { generatedUntil: day('2026-10-14') });
  });

  it('does not touch the series when nothing is left to generate', async () => {
    await generateSeriesOccurrences({ ...series, generatedUntil: day('2026-10-21') }, saturday);
    expect(createEvent).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
