// Flux iCal lu par l'agenda du joueur, authentifié par le jeton (SIMS-204).
import { CalendarFeedNotFoundError } from '../calendar_feed.errors';
import { hashFeedToken } from '../calendar_feed.token';
import {
  FEED_HISTORY_DAYS,
  FEED_MAX_EVENTS,
  renderCalendarFeed,
} from '../usecases/renderCalendarFeed';

const findByTokenHash = vi.fn();
const touch = vi.fn();
const findUserCharacters = vi.fn();
const findManagedOrGuestRealmIds = vi.fn();
const findEvents = vi.fn();
const findSignups = vi.fn();

vi.mock('../calendar_feed.repository', () => ({
  default: {
    findByTokenHash: (...a: unknown[]) => findByTokenHash(...a),
    touch: (...a: unknown[]) => touch(...a),
    findUserCharacters: (...a: unknown[]) => findUserCharacters(...a),
    findManagedOrGuestRealmIds: (...a: unknown[]) => findManagedOrGuestRealmIds(...a),
    findEvents: (...a: unknown[]) => findEvents(...a),
    findSignups: (...a: unknown[]) => findSignups(...a),
  },
}));

const TOKEN = 'A'.repeat(43);
const now = new Date('2026-02-01T12:00:00Z');
const TENTATIVE_SIGNUP = {
  eventId: 7,
  characterId: 10,
  status: 'TENTATIVE',
  lateTime: null,
  updatedAt: new Date('2026-01-25T10:00:00Z'),
  character: { name: 'Arthas' },
};

beforeEach(() => {
  findByTokenHash.mockReset().mockResolvedValue({ id: 5, userId: 'u1' });
  touch.mockReset().mockResolvedValue(undefined);
  findUserCharacters.mockReset().mockResolvedValue([{ id: 10, name: 'Arthas', realmId: 1 }]);
  findManagedOrGuestRealmIds.mockReset().mockResolvedValue([2]);
  findEvents.mockReset().mockResolvedValue([
    {
      id: 7,
      title: 'Manaforge',
      description: null,
      startTime: new Date('2026-02-02T20:00:00Z'),
      endTime: new Date('2026-02-02T23:00:00Z'),
      status: 'SCHEDULED',
      isOptional: false,
      updatedAt: new Date('2026-01-20T10:00:00Z'),
      realmId: 1,
      realm: { guildName: 'Les Sims' },
    },
  ]);
  findSignups.mockReset().mockResolvedValue([TENTATIVE_SIGNUP]);
});

describe('renderCalendarFeed', () => {
  it('looks the feed up by the hash of the token, with or without .ics', async () => {
    await renderCalendarFeed(`${TOKEN}.ics`, now);
    await renderCalendarFeed(TOKEN, now);

    expect(findByTokenHash).toHaveBeenNthCalledWith(1, hashFeedToken(TOKEN));
    expect(findByTokenHash).toHaveBeenNthCalledWith(2, hashFeedToken(TOKEN));
  });

  it('refuses an unknown, regenerated or revoked token', async () => {
    findByTokenHash.mockResolvedValueOnce(null);

    await expect(renderCalendarFeed(TOKEN, now)).rejects.toBeInstanceOf(CalendarFeedNotFoundError);
    expect(findEvents).not.toHaveBeenCalled();
  });

  it('only reads the realms of the token owner', async () => {
    await renderCalendarFeed(TOKEN, now);

    expect(findUserCharacters).toHaveBeenCalledWith('u1');
    expect(findManagedOrGuestRealmIds).toHaveBeenCalledWith('u1');
    const [realmIds, from, limit] = findEvents.mock.calls[0];
    expect(realmIds).toEqual([1, 2]);
    expect(from).toEqual(new Date(now.getTime() - FEED_HISTORY_DAYS * 24 * 3600 * 1000));
    expect(limit).toBe(FEED_MAX_EVENTS);
  });

  it('reads the signups of the player characters only', async () => {
    await renderCalendarFeed(TOKEN, now);
    expect(findSignups).toHaveBeenCalledWith([7], [10]);
  });

  it('returns an iCalendar document with the event and the player status', async () => {
    const ics = await renderCalendarFeed(TOKEN, now);

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:raid-event-7@droptimizer');
    expect(ics).toContain('DTSTART:20260202T200000Z');
    expect(ics).toContain('SUMMARY:Manaforge [Incertain]');
    expect(ics).toContain('LAST-MODIFIED:20260125T100000Z');
  });

  it('records the last use of the feed', async () => {
    await renderCalendarFeed(TOKEN, now);
    expect(touch).toHaveBeenCalledWith(5, now);
  });

  it('still serves the feed when recording the last use fails', async () => {
    touch.mockRejectedValueOnce(new Error('db busy'));
    await expect(renderCalendarFeed(TOKEN, now)).resolves.toContain('BEGIN:VEVENT');
  });

  it('returns an empty calendar for a player without any realm', async () => {
    findUserCharacters.mockResolvedValueOnce([]);
    findManagedOrGuestRealmIds.mockResolvedValueOnce([]);

    const ics = await renderCalendarFeed(TOKEN, now);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(findEvents).not.toHaveBeenCalled();
  });

  it('skips the signup query for a player without characters', async () => {
    findUserCharacters.mockResolvedValueOnce([]);

    await renderCalendarFeed(TOKEN, now);

    expect(findSignups).not.toHaveBeenCalled();
  });
});
