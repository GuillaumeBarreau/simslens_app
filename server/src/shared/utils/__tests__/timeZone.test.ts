// Fuseaux horaires des messages Discord (SIMS-204).
import {
  DEFAULT_TIME_ZONE,
  formatClockTime,
  formatDayTime,
  isValidTimeZone,
  resolveTimeZone,
} from '../timeZone';

describe('isValidTimeZone', () => {
  it.each(['Europe/Paris', 'America/New_York', 'Asia/Tokyo', 'UTC'])('accepts %s', (tz) => {
    expect(isValidTimeZone(tz)).toBe(true);
  });

  it.each(['Mars/Olympus', 'Paris', '', '   ', null, undefined, 42])('refuses %s', (tz) => {
    expect(isValidTimeZone(tz)).toBe(false);
  });
});

describe('resolveTimeZone', () => {
  it('keeps a valid time zone', () => {
    expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
  });

  it.each([null, undefined, 'Mars/Olympus'])('falls back to the default for %s', (tz) => {
    expect(resolveTimeZone(tz)).toBe(DEFAULT_TIME_ZONE);
  });
});

describe('formatClockTime', () => {
  const start = new Date('2026-02-02T20:00:00Z');

  it('formats the time in the given zone', () => {
    expect(formatClockTime(start, 'Europe/Paris')).toBe('21:00');
    expect(formatClockTime(start, 'America/New_York')).toBe('15:00');
    expect(formatClockTime(start, 'UTC')).toBe('20:00');
  });

  it('follows daylight saving time', () => {
    expect(formatClockTime(new Date('2026-07-02T19:00:00Z'), 'Europe/Paris')).toBe('21:00');
  });
});

describe('formatDayTime', () => {
  it('gives the day and the time in the zone, the day changing with it', () => {
    const late = new Date('2026-02-02T23:30:00Z');
    expect(formatDayTime(late, 'Europe/Paris')).toBe('mardi 3 février à 00:30');
    expect(formatDayTime(late, 'UTC')).toBe('lundi 2 février à 23:30');
  });
});
