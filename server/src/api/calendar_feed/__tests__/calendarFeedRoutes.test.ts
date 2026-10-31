// Route publique du flux iCal sur les vrais routeurs de /1/events (SIMS-204) :
// servie avant '/:id', et jamais de jeton en clair dans les journaux.
// Voir helpers/feedRoutes.cjs.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { maskCalendarFeedToken, MASKED_TOKEN } from '../calendar_feed.middleware';

type Result = {
  status: number;
  contentType: string | null;
  body: string;
  loggedUrl: string | null;
  errorPath: string | null;
};

const SERVER = path.resolve(__dirname, '../../../..');
const TOKEN = 'T'.repeat(43);
const UNKNOWN = 'U'.repeat(43);

const REQUESTS = [
  { method: 'GET', path: `/1/events/calendar-feed/${TOKEN}.ics` },
  { method: 'GET', path: `/1/events/calendar-feed/${UNKNOWN}.ics` },
  { method: 'GET', path: '/1/events/calendar-feed/pas-un-jeton' },
  { method: 'GET', path: '/1/events/calendar-feed' },
];

describe('maskCalendarFeedToken', () => {
  it('masks the token of the feed URL, with or without query string', () => {
    expect(maskCalendarFeedToken(`/1/events/calendar-feed/${TOKEN}.ics?x=1`)).toBe(
      `/1/events/calendar-feed/${MASKED_TOKEN}?x=1`,
    );
  });

  it('leaves other URLs untouched', () => {
    expect(maskCalendarFeedToken('/1/events/12')).toBe('/1/events/12');
    expect(maskCalendarFeedToken('/1/events/calendar-feed')).toBe('/1/events/calendar-feed');
  });
});

describe('route du flux iCal sur les vrais routeurs', () => {
  let results: Result[] = [];

  beforeAll(() => {
    const run = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        path.join(__dirname, 'helpers', 'feedRoutes.cjs'),
        JSON.stringify({ token: TOKEN, requests: REQUESTS }),
      ],
      { cwd: SERVER, encoding: 'utf8', timeout: 90_000, env: process.env },
    );
    const lastLine = (run.stdout || '').trim().split('\n').pop() || '[]';
    try {
      results = JSON.parse(lastLine);
    } catch {
      throw new Error(`Sortie illisible :\n${run.stdout}\n${run.stderr}`);
    }
  }, 120_000);

  it('replays every request', () => {
    expect(results).toHaveLength(REQUESTS.length);
  });

  it('serves the feed without session, from the public route (not /:id)', () => {
    expect(results[0].status).toBe(200);
    expect(results[0].contentType).toContain('text/calendar');
    expect(results[0].body.startsWith('BEGIN:VCALENDAR')).toBe(true);
  });

  it('answers 404 for an unknown or revoked token', () => {
    expect(results[1].status).toBe(404);
  });

  it('answers 400 for a malformed token', () => {
    expect(results[2].status).toBe(400);
  });

  it('keeps the management route behind the session', () => {
    expect(results[3].status).toBe(401);
  });

  it('never writes the token in the request log nor in the error path', () => {
    for (const result of results.slice(0, 3)) {
      expect(result.loggedUrl).toContain(`/1/events/calendar-feed/${MASKED_TOKEN}`);
      expect(result.loggedUrl).not.toContain(TOKEN);
      expect(result.loggedUrl).not.toContain(UNKNOWN);
    }
    expect(results[1].errorPath).toBe(`/1/events/calendar-feed/${MASKED_TOKEN}`);
    expect(results[2].errorPath).toBe(`/1/events/calendar-feed/${MASKED_TOKEN}`);
  });
});
