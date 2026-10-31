/**
 * Compositions des raids passés de même difficulté, pour servir de base à
 * un import.
 */

import { getEventDifficultyInRealm } from '../roster.eventAccess';
import rosterRepository from '../roster.repository';

export async function getPastEventRosters(eventId: number, realmId: number): Promise<unknown[]> {
  const raidDifficultyId = await getEventDifficultyInRealm(eventId, realmId);

  return rosterRepository.findPastEventsWithRoster(realmId, raidDifficultyId, eventId);
}
