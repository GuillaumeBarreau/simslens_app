import type {
  CalendarFeedTokenEntity,
  FeedCharacter,
  FeedEventRow,
  FeedSignupRow,
} from './calendar_feed.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript (cf.
 * docs/api/architecture.md, « Un repository resté en .js a besoin d'un .d.ts »).
 */
declare const calendarFeedRepository: {
  findByUserId(userId: string): Promise<CalendarFeedTokenEntity | null>;
  findByTokenHash(tokenHash: string): Promise<CalendarFeedTokenEntity | null>;
  upsertForUser(userId: string, tokenHash: string): Promise<CalendarFeedTokenEntity>;
  deleteForUser(userId: string): Promise<number>;
  touch(id: number, date: Date): Promise<void>;
  findUserCharacters(userId: string): Promise<FeedCharacter[]>;
  findManagedOrGuestRealmIds(userId: string): Promise<number[]>;
  findEvents(realmIds: number[], from: Date, limit: number): Promise<FeedEventRow[]>;
  findSignups(eventIds: number[], characterIds: number[]): Promise<FeedSignupRow[]>;
};

export default calendarFeedRepository;
