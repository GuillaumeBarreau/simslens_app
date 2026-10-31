// Contenu du flux iCal : soirées des royaumes du joueur et son statut (SIMS-204).
import {
  feedRealmIds,
  NOT_SIGNED_UP_LABEL,
  revisionOf,
  signupSummary,
  toICalEvent,
} from '../calendar_feed.events';
import type { FeedCharacter, FeedEventRow, FeedSignupRow } from '../calendar_feed.types';

const now = new Date('2026-02-01T12:00:00Z');

const event = (overrides: Partial<FeedEventRow> = {}): FeedEventRow => ({
  id: 7,
  title: 'Manaforge HM',
  description: null,
  startTime: new Date('2026-02-02T20:00:00Z'),
  endTime: new Date('2026-02-02T23:00:00Z'),
  status: 'SCHEDULED',
  isOptional: false,
  updatedAt: new Date('2026-01-20T10:00:00Z'),
  realmId: 1,
  realm: { guildName: 'Les Sims' },
  ...overrides,
});

const signup = (overrides: Partial<FeedSignupRow> = {}): FeedSignupRow => ({
  eventId: 7,
  characterId: 10,
  status: 'PRESENT',
  lateTime: null,
  updatedAt: new Date('2026-01-25T10:00:00Z'),
  character: { name: 'Arthas' },
  ...overrides,
});

const characters: FeedCharacter[] = [
  { id: 10, name: 'Arthas', realmId: 1 },
  { id: 11, name: 'Jaina', realmId: 1 },
];

describe('feedRealmIds', () => {
  it('merges the realms of the characters with the managed and guest ones, without duplicates', () => {
    expect(feedRealmIds(characters, [3, 1, 2])).toEqual([1, 2, 3]);
  });

  it('is empty for a player without any realm', () => {
    expect(feedRealmIds([], [])).toEqual([]);
  });
});

describe('signupSummary', () => {
  it('gives the status of the signed up character', () => {
    expect(signupSummary(event(), [signup()], characters)).toEqual({
      short: 'Présent',
      detail: 'Présent (Arthas)',
    });
  });

  it('shows the arrival time of a late player', () => {
    const summary = signupSummary(
      event(),
      [signup({ status: 'LATE', lateTime: '21:30' })],
      characters,
    );
    expect(summary?.short).toBe('En retard (21:30)');
  });

  it('lists every signed up character, and each distinct status once in the short form', () => {
    const summary = signupSummary(
      event(),
      [signup(), signup({ characterId: 11, status: 'PRESENT', character: { name: 'Jaina' } })],
      characters,
    );
    expect(summary).toEqual({ short: 'Présent', detail: 'Présent (Arthas), Présent (Jaina)' });
  });

  it('says « not signed up » when the player has a character in the realm', () => {
    expect(signupSummary(event(), [], characters)).toEqual({
      short: NOT_SIGNED_UP_LABEL,
      detail: NOT_SIGNED_UP_LABEL,
    });
  });

  it('has no status for a realm without any character of the player (officer, guest)', () => {
    expect(signupSummary(event({ realmId: 2 }), [], characters)).toBeNull();
  });

  it('ignores signups of other events', () => {
    expect(signupSummary(event(), [signup({ eventId: 8 })], characters)?.short).toBe(
      NOT_SIGNED_UP_LABEL,
    );
  });

  it('ignores the signup of a character outside the realm of the event', () => {
    const elsewhere: FeedCharacter[] = [{ id: 10, name: 'Arthas', realmId: 2 }];
    expect(signupSummary(event(), [signup()], elsewhere)).toBeNull();
  });
});

describe('revisionOf', () => {
  it('takes the latest change between the event and the signups of the player', () => {
    const { lastModified } = revisionOf(event(), [signup()], characters);
    expect(lastModified).toEqual(new Date('2026-01-25T10:00:00Z'));
  });

  it('falls back to the event when the player has no signup', () => {
    expect(revisionOf(event(), [], characters).lastModified).toEqual(
      new Date('2026-01-20T10:00:00Z'),
    );
  });

  it('ignores the signups of other events', () => {
    const other = signup({ eventId: 8, updatedAt: new Date('2026-01-30T00:00:00Z') });
    expect(revisionOf(event(), [other], characters).lastModified).toEqual(
      new Date('2026-01-20T10:00:00Z'),
    );
  });

  it('increases the sequence with every change', () => {
    const before = revisionOf(event(), [], characters).sequence;
    const after = revisionOf(event(), [signup()], characters).sequence;
    expect(before).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(after)).toBe(true);
    expect(after).toBeGreaterThan(before);
  });
});

describe('toICalEvent', () => {
  it('carries the revision, so that clients detect updates', () => {
    expect(toICalEvent(event(), [signup()], characters, now)).toMatchObject({
      lastModified: new Date('2026-01-25T10:00:00Z'),
      sequence: expect.any(Number),
    });
  });

  it('builds a stable UID, the UTC times and the status in the title', () => {
    const ical = toICalEvent(event(), [signup()], characters, now);

    expect(ical).toMatchObject({
      uid: 'raid-event-7@droptimizer',
      start: new Date('2026-02-02T20:00:00Z'),
      end: new Date('2026-02-02T23:00:00Z'),
      stamp: now,
      summary: 'Manaforge HM [Présent]',
      status: 'CONFIRMED',
    });
  });

  it('describes the guild, the signup and the event description', () => {
    const { description } = toICalEvent(
      event({ description: 'Flask obligatoire', isOptional: true }),
      [signup()],
      characters,
      now,
    );

    expect(description).toBe(
      'Guilde : Les Sims\nInscription : Présent (Arthas)\nSoirée facultative\n\nFlask obligatoire',
    );
  });

  it('marks a cancelled event as cancelled', () => {
    expect(toICalEvent(event({ status: 'CANCELLED' }), [], characters, now).status).toBe(
      'CANCELLED',
    );
  });

  it('keeps the bare title when the player has no character in the realm', () => {
    const ical = toICalEvent(event({ realmId: 2 }), [], characters, now);
    expect(ical.summary).toBe('Manaforge HM');
    expect(ical.description).toBe('Guilde : Les Sims');
  });
});
