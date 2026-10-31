import {
  addDays,
  convertLocalTime,
  isValidTimeZone,
  localDateOf,
  nextWeekday,
  occurrenceTimes,
  parseDateOnly,
  plannedOccurrenceDates,
  zonedTimeToUtc,
} from '../eventSeries.schedule';

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('convertLocalTime', () => {
  it('expresses a local time of one zone in another', () => {
    expect(convertLocalTime(day('2026-10-21'), '20:00', 'Europe/London', 'Europe/Paris')).toBe(
      '21:00',
    );
    expect(convertLocalTime(day('2026-10-21'), '21:00', 'Europe/Paris', 'America/New_York')).toBe(
      '15:00',
    );
  });

  it('keeps the time within the same zone', () => {
    expect(convertLocalTime(day('2026-10-21'), '20:30', 'Europe/Paris', 'Europe/Paris')).toBe(
      '20:30',
    );
  });

  it('wraps around midnight', () => {
    expect(convertLocalTime(day('2026-10-21'), '23:30', 'Europe/London', 'Europe/Paris')).toBe(
      '00:30',
    );
  });
});

describe('parseDateOnly', () => {
  it('reads a date as UTC midnight', () => {
    expect(parseDateOnly('2026-10-14')).toEqual(day('2026-10-14'));
  });

  it.each(['2026-02-30', '2026-13-01', '14/10/2026', '2026-10-14T20:00'])(
    'rejects %s',
    (value: string) => {
      expect(parseDateOnly(value)).toBeNull();
    },
  );
});

describe('isValidTimeZone', () => {
  it('accepts IANA zones', () => {
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
  });

  it('rejects unknown zones', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('zonedTimeToUtc', () => {
  it('applies summer time in Paris', () => {
    expect(zonedTimeToUtc(day('2026-10-14'), '21:00', 'Europe/Paris')).toEqual(
      new Date('2026-10-14T19:00:00Z'),
    );
  });

  it('applies winter time in Paris', () => {
    expect(zonedTimeToUtc(day('2026-11-04'), '21:00', 'Europe/Paris')).toEqual(
      new Date('2026-11-04T20:00:00Z'),
    );
  });

  it('keeps the local hour across the autumn change of time', () => {
    const before = zonedTimeToUtc(day('2026-10-21'), '21:00', 'Europe/Paris');
    const after = zonedTimeToUtc(day('2026-10-28'), '21:00', 'Europe/Paris');
    expect(after.getTime() - before.getTime()).toBe((7 * 24 + 1) * 3600 * 1000);
  });

  it('handles a zone behind UTC, the instant falling on the next UTC day', () => {
    expect(zonedTimeToUtc(day('2026-07-01'), '20:00', 'America/New_York')).toEqual(
      new Date('2026-07-02T00:00:00Z'),
    );
  });
});

describe('occurrenceTimes', () => {
  it('builds start and end on the same day', () => {
    expect(occurrenceTimes(day('2026-10-14'), '21:00', '23:30', 'Europe/Paris')).toEqual({
      startTime: new Date('2026-10-14T19:00:00Z'),
      endTime: new Date('2026-10-14T21:30:00Z'),
    });
  });

  it('ends the next day when the end time is not after the start time', () => {
    expect(occurrenceTimes(day('2026-10-14'), '23:00', '01:00', 'Europe/Paris').endTime).toEqual(
      new Date('2026-10-14T23:00:00Z'),
    );
  });
});

describe('localDateOf', () => {
  it('gives the local calendar date of an instant', () => {
    expect(localDateOf(new Date('2026-10-14T23:30:00Z'), 'Europe/Paris')).toEqual(
      day('2026-10-15'),
    );
    expect(localDateOf(new Date('2026-10-14T23:30:00Z'), 'America/New_York')).toEqual(
      day('2026-10-14'),
    );
  });
});

describe('nextWeekday', () => {
  // 2026-10-14 est un mercredi (3).
  it('keeps the date when it already is the right weekday', () => {
    expect(nextWeekday(day('2026-10-14'), 3)).toEqual(day('2026-10-14'));
  });

  it('moves forward within the week, or to the next week', () => {
    expect(nextWeekday(day('2026-10-14'), 5)).toEqual(day('2026-10-16'));
    expect(nextWeekday(day('2026-10-14'), 1)).toEqual(day('2026-10-19'));
  });
});

describe('plannedOccurrenceDates', () => {
  const series = {
    dayOfWeek: 3,
    weeksAhead: 4,
    startsOn: day('2026-10-14'),
    endsOn: null,
    generatedUntil: null,
  };
  const today = day('2026-10-10');

  it('plans weeksAhead weeks of occurrences from the first date', () => {
    expect(plannedOccurrenceDates(series, today)).toEqual([
      day('2026-10-14'),
      day('2026-10-21'),
      day('2026-10-28'),
      day('2026-11-04'),
    ]);
  });

  it('skips the dates already generated', () => {
    expect(plannedOccurrenceDates({ ...series, generatedUntil: day('2026-10-28') }, today)).toEqual(
      [day('2026-11-04')],
    );
  });

  it('never plans a date before today', () => {
    const dates = plannedOccurrenceDates(
      { ...series, startsOn: day('2026-09-02') },
      day('2026-10-15'),
    );
    expect(dates[0]).toEqual(day('2026-10-21'));
  });

  it('stops at the end of the series', () => {
    expect(plannedOccurrenceDates({ ...series, endsOn: day('2026-10-21') }, today)).toEqual([
      day('2026-10-14'),
      day('2026-10-21'),
    ]);
  });

  it("includes today's occurrence", () => {
    expect(plannedOccurrenceDates({ ...series, weeksAhead: 1 }, day('2026-10-14'))).toEqual([
      day('2026-10-14'),
    ]);
  });

  it('plans nothing once the horizon is covered', () => {
    expect(
      plannedOccurrenceDates({ ...series, generatedUntil: addDays(today, 40) }, today),
    ).toEqual([]);
  });
});
