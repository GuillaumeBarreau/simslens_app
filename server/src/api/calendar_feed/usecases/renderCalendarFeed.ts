/**
 * Flux iCal d'un joueur, lu par son agenda avec le jeton de l'URL (SIMS-204).
 *
 * Pas de session : le jeton identifie le joueur. Le flux couvre les soirées
 * de ses royaumes, du mois écoulé jusqu'aux prochaines, avec le statut d'inscription de
 * ses personnages.
 */

import { CalendarFeedNotFoundError } from '../calendar_feed.errors';
import { feedRealmIds, toICalEvent } from '../calendar_feed.events';
import { buildCalendar } from '../calendar_feed.ical';
import calendarFeedRepository from '../calendar_feed.repository';
import { hashFeedToken, tokenFromFileName } from '../calendar_feed.token';

/** Profondeur d'historique : les soirées du dernier mois restent visibles. */
export const FEED_HISTORY_DAYS = 30;

/** Plafond du nombre de soirées, pour borner la réponse. */
export const FEED_MAX_EVENTS = 500;

const DAY_MS = 24 * 3600 * 1000;

export const CALENDAR_NAME = 'Droptimizer — Raids';

export async function renderCalendarFeed(fileName: string, now = new Date()): Promise<string> {
  const feed = await calendarFeedRepository.findByTokenHash(
    hashFeedToken(tokenFromFileName(fileName)),
  );
  if (!feed) throw new CalendarFeedNotFoundError();

  // Indicatif seulement : un échec d'écriture ne doit pas priver l'agenda du flux.
  await calendarFeedRepository.touch(feed.id, now).catch(() => undefined);

  const [characters, otherRealmIds] = await Promise.all([
    calendarFeedRepository.findUserCharacters(feed.userId),
    calendarFeedRepository.findManagedOrGuestRealmIds(feed.userId),
  ]);
  const realmIds = feedRealmIds(characters, otherRealmIds);
  if (realmIds.length === 0) return buildCalendar({ name: CALENDAR_NAME, events: [] });

  const from = new Date(now.getTime() - FEED_HISTORY_DAYS * DAY_MS);
  const events = await calendarFeedRepository.findEvents(realmIds, from, FEED_MAX_EVENTS);
  const signups =
    events.length > 0 && characters.length > 0
      ? await calendarFeedRepository.findSignups(
          events.map((e) => e.id),
          characters.map((c) => c.id),
        )
      : [];

  return buildCalendar({
    name: CALENDAR_NAME,
    events: events.map((event) => toICalEvent(event, signups, characters, now)),
  });
}
