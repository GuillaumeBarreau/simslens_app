import { buildCalendarFeedUrl, timeZoneOptions, toWebcalUrl } from './index';

const TOKEN = 'abcDEF123_-xyz';

describe('buildCalendarFeedUrl', () => {
  it('appends the feed path to an absolute API base', () => {
    expect(buildCalendarFeedUrl('https://api.example.com', TOKEN, 'https://app.example.com')).toBe(
      `https://api.example.com/1/events/calendar-feed/${TOKEN}.ics`,
    );
  });

  it('ignores the trailing slashes of the base', () => {
    expect(buildCalendarFeedUrl('https://api.example.com//', TOKEN, 'https://x')).toBe(
      `https://api.example.com/1/events/calendar-feed/${TOKEN}.ics`,
    );
  });

  it('resolves a relative API base on the page origin', () => {
    expect(buildCalendarFeedUrl('/api', TOKEN, 'https://app.example.com')).toBe(
      `https://app.example.com/api/1/events/calendar-feed/${TOKEN}.ics`,
    );
  });

  it('works without any base', () => {
    expect(buildCalendarFeedUrl(undefined, TOKEN, 'http://localhost:5173')).toBe(
      `http://localhost:5173/1/events/calendar-feed/${TOKEN}.ics`,
    );
  });
});

describe('toWebcalUrl', () => {
  it.each(['https://', 'http://'])('replaces %s with webcal://', (scheme) => {
    expect(toWebcalUrl(`${scheme}api.example.com/feed.ics`)).toBe(
      'webcal://api.example.com/feed.ics',
    );
  });
});

describe('timeZoneOptions', () => {
  it('offers the usual zones, sorted', () => {
    const zones = timeZoneOptions();
    expect(zones).toContain('Europe/Paris');
    expect(zones).toContain('America/New_York');
    expect(zones).toContain('UTC');
    expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones);
  });

  it('keeps the current zone even when the engine does not list it', () => {
    expect(timeZoneOptions('Etc/GMT-3')).toContain('Etc/GMT-3');
  });

  it('does not duplicate a listed zone', () => {
    expect(timeZoneOptions('Europe/Paris').filter((z) => z === 'Europe/Paris')).toHaveLength(1);
  });
});
