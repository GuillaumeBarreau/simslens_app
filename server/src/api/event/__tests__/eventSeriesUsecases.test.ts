import {
  EventSeriesFromDateNotGeneratedError,
  EventSeriesNotAccessibleError,
} from '../event.errors';
import type { EventSeriesEntity } from '../event.types';
import { createEventSeries } from '../usecases/createEventSeries';
import { deleteEventSeries } from '../usecases/deleteEventSeries';
import { occurrenceChanges, updateEventSeries } from '../usecases/updateEventSeries';

const repo = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  findUpcomingOccurrences: vi.fn(),
};
const updateEvent = vi.fn();
const cancelEvent = vi.fn();
const generateSeriesOccurrences = vi.fn();

vi.mock('../eventSeries.repository', () => ({
  default: {
    create: (...a: unknown[]) => repo.create(...a),
    findById: (...a: unknown[]) => repo.findById(...a),
    update: (...a: unknown[]) => repo.update(...a),
    findUpcomingOccurrences: (...a: unknown[]) => repo.findUpcomingOccurrences(...a),
  },
}));
vi.mock('../event.service', () => ({
  default: {
    updateEvent: (...a: unknown[]) => updateEvent(...a),
    cancelEvent: (...a: unknown[]) => cancelEvent(...a),
  },
}));
vi.mock('../usecases/generateSeriesOccurrences', () => ({
  generateSeriesOccurrences: (...a: unknown[]) => generateSeriesOccurrences(...a),
}));

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const now = new Date('2026-10-10T12:00:00Z');

const series = {
  id: 9,
  realmId: 3,
  title: 'Manaforge - Heroic',
  startTime: '21:00',
  endTime: '23:30',
  timezone: 'Europe/Paris',
  startsOn: day('2026-10-14'),
  generatedUntil: day('2026-11-04'),
  active: true,
} as EventSeriesEntity;

beforeEach(() => {
  Object.values(repo).forEach((fn) => fn.mockReset());
  repo.create.mockResolvedValue(series);
  repo.findById.mockResolvedValue(series);
  repo.update.mockImplementation(async (_id: number, data: object) => ({ ...series, ...data }));
  repo.findUpcomingOccurrences.mockResolvedValue([
    { id: 101, seriesOccurrenceDate: day('2026-10-21') },
    { id: 102, seriesOccurrenceDate: day('2026-11-04') },
  ]);
  updateEvent.mockReset().mockResolvedValue({});
  cancelEvent.mockReset().mockResolvedValue({});
  generateSeriesOccurrences.mockReset().mockResolvedValue(4);
});

describe('createEventSeries', () => {
  const input = {
    title: 'Manaforge - Heroic',
    startDate: day('2026-10-14'),
    startTime: '21:00',
    endTime: '23:30',
    timezone: 'Europe/Paris',
    weeksAhead: 4,
  };

  it('stores the series in the checked realm, on the weekday of its first date', async () => {
    await createEventSeries(input, 3, '42', now);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        realmId: 3,
        dayOfWeek: 3,
        startsOn: day('2026-10-14'),
        createdBy: '42',
        defaultPresent: false,
      }),
    );
  });

  it('generates the first occurrences right away', async () => {
    await expect(createEventSeries(input, 3, '42', now)).resolves.toEqual({ series, events: 4 });
    expect(generateSeriesOccurrences).toHaveBeenCalledWith(series, now);
  });
});

describe('occurrenceChanges', () => {
  const template = { startTime: '21:00', endTime: '23:30', timezone: 'Europe/Paris' };

  it('copies the plain fields', () => {
    expect(
      occurrenceChanges({ title: 'New', isOptional: true }, template, day('2026-10-21')),
    ).toEqual({ title: 'New', isOptional: true });
  });

  it('recomputes the times on the occurrence date, keeping the unchanged bound', () => {
    expect(occurrenceChanges({ startTime: '20:30' }, template, day('2026-11-04'))).toEqual({
      startTime: new Date('2026-11-04T19:30:00Z'),
      endTime: new Date('2026-11-04T22:30:00Z'),
    });
  });

  it('ignores the generation settings', () => {
    expect(
      occurrenceChanges({ weeksAhead: 8, defaultPresent: true }, template, day('2026-10-21')),
    ).toEqual({});
  });
});

describe('updateEventSeries', () => {
  it('refuses a series of another realm', async () => {
    repo.findById.mockResolvedValueOnce({ ...series, realmId: 99 });
    await expect(
      updateEventSeries(9, 3, { fromDate: day('2026-10-21'), title: 'x' }, now),
    ).rejects.toBeInstanceOf(EventSeriesNotAccessibleError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('refuses an unknown series', async () => {
    repo.findById.mockResolvedValueOnce(null);
    await expect(
      updateEventSeries(9, 3, { fromDate: day('2026-10-21'), title: 'x' }, now),
    ).rejects.toBeInstanceOf(EventSeriesNotAccessibleError);
  });

  it('updates the series, then each upcoming occurrence from the date', async () => {
    const result = await updateEventSeries(
      9,
      3,
      { fromDate: day('2026-10-21'), title: 'Renamed' },
      now,
    );

    expect(repo.update).toHaveBeenCalledWith(9, { title: 'Renamed' });
    expect(repo.findUpcomingOccurrences).toHaveBeenCalledWith(9, day('2026-10-21'), now);
    expect(updateEvent).toHaveBeenCalledWith(101, { title: 'Renamed' }, 3);
    expect(updateEvent).toHaveBeenCalledWith(102, { title: 'Renamed' }, 3);
    expect(result.events).toBe(2);
  });

  it('moves each occurrence to the new local time of its own date', async () => {
    await updateEventSeries(9, 3, { fromDate: day('2026-10-21'), startTime: '20:00' }, now);
    expect(updateEvent).toHaveBeenCalledWith(
      101,
      {
        startTime: new Date('2026-10-21T18:00:00Z'),
        endTime: new Date('2026-10-21T21:30:00Z'),
      },
      3,
    );
    expect(updateEvent).toHaveBeenCalledWith(
      102,
      {
        startTime: new Date('2026-11-04T19:00:00Z'),
        endTime: new Date('2026-11-04T22:30:00Z'),
      },
      3,
    );
  });

  it('refuses a date the series has not generated yet', async () => {
    await expect(
      updateEventSeries(9, 3, { fromDate: day('2026-11-11'), title: 'x' }, now),
    ).rejects.toBeInstanceOf(EventSeriesFromDateNotGeneratedError);
    expect(repo.update).not.toHaveBeenCalled();
    expect(updateEvent).not.toHaveBeenCalled();
  });

  it('refuses any date while nothing has been generated', async () => {
    repo.findById.mockResolvedValueOnce({ ...series, generatedUntil: null });
    await expect(
      updateEventSeries(9, 3, { fromDate: day('2026-10-14'), title: 'x' }, now),
    ).rejects.toBeInstanceOf(EventSeriesFromDateNotGeneratedError);
  });

  it('accepts the last generated date', async () => {
    await expect(
      updateEventSeries(9, 3, { fromDate: day('2026-11-04'), title: 'x' }, now),
    ).resolves.toMatchObject({ events: 2 });
  });

  it('converts times typed in another time zone into the series time zone', async () => {
    await updateEventSeries(
      9,
      3,
      { fromDate: day('2026-10-21'), startTime: '20:00', timezone: 'Europe/London' },
      now,
    );

    expect(repo.update).toHaveBeenCalledWith(9, { startTime: '21:00' });
    expect(updateEvent).toHaveBeenCalledWith(
      101,
      {
        startTime: new Date('2026-10-21T19:00:00Z'),
        endTime: new Date('2026-10-21T21:30:00Z'),
      },
      3,
    );
  });

  it('fills a longer horizon right away', async () => {
    await updateEventSeries(9, 3, { fromDate: day('2026-10-21'), weeksAhead: 8 }, now);
    expect(updateEvent).not.toHaveBeenCalled();
    expect(generateSeriesOccurrences).toHaveBeenCalledWith(
      expect.objectContaining({ weeksAhead: 8 }),
      now,
    );
  });
});

describe('deleteEventSeries', () => {
  it('refuses a series of another realm', async () => {
    repo.findById.mockResolvedValueOnce({ ...series, realmId: 99 });
    await expect(deleteEventSeries(9, 3, day('2026-10-21'), now)).rejects.toBeInstanceOf(
      EventSeriesNotAccessibleError,
    );
    expect(cancelEvent).not.toHaveBeenCalled();
  });

  it('ends the series the day before and cancels its upcoming occurrences', async () => {
    const result = await deleteEventSeries(9, 3, day('2026-10-21'), now);

    expect(repo.update).toHaveBeenCalledWith(9, { endsOn: day('2026-10-20') });
    expect(cancelEvent).toHaveBeenCalledWith(101, 3);
    expect(cancelEvent).toHaveBeenCalledWith(102, 3);
    expect(result.events).toBe(2);
  });

  it('does not restart the series on a second, later stop', async () => {
    repo.findById.mockResolvedValueOnce({ ...series, endsOn: day('2026-10-20') });
    await deleteEventSeries(9, 3, day('2026-11-04'), now);
    expect(repo.update).toHaveBeenCalledWith(9, { endsOn: day('2026-10-20') });
  });

  it('brings an existing end forward on an earlier stop', async () => {
    repo.findById.mockResolvedValueOnce({ ...series, endsOn: day('2026-11-03') });
    await deleteEventSeries(9, 3, day('2026-10-21'), now);
    expect(repo.update).toHaveBeenCalledWith(9, { endsOn: day('2026-10-20') });
  });

  it('deactivates a series stopped from its first date', async () => {
    await deleteEventSeries(9, 3, day('2026-10-14'), now);
    expect(repo.update).toHaveBeenCalledWith(9, { active: false });
  });
});
