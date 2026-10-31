/**
 * Un seul flux par joueur. Régénérer remplace le jeton (l'ancienne URL
 * cesse de fonctionner), révoquer le supprime. Le jeton brut n'est renvoyé
 * qu'à sa création : seule son empreinte est stockée.
 */

import calendarFeedRepository from '../calendar_feed.repository';
import { generateFeedToken, hashFeedToken } from '../calendar_feed.token';
import type { CalendarFeedCreated, CalendarFeedStatus } from '../calendar_feed.types';

export async function getCalendarFeedStatus(userId: string): Promise<CalendarFeedStatus> {
  const feed = await calendarFeedRepository.findByUserId(userId);

  return {
    active: !!feed,
    createdAt: feed?.createdAt ?? null,
    lastUsedAt: feed?.lastUsedAt ?? null,
  };
}

export async function regenerateCalendarFeed(userId: string): Promise<CalendarFeedCreated> {
  const token = generateFeedToken();
  const feed = await calendarFeedRepository.upsertForUser(userId, hashFeedToken(token));

  return { token, createdAt: feed.createdAt };
}

export async function revokeCalendarFeed(userId: string): Promise<CalendarFeedStatus> {
  await calendarFeedRepository.deleteForUser(userId);

  return { active: false, createdAt: null, lastUsedAt: null };
}
