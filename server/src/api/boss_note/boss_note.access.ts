import { BossNoteEventNotFoundError } from './boss_note.errors';
import bossNoteRepository from './boss_note.repository';
import type { EventRaid } from './boss_note.rules';

/**
 * Rattache l'événement :eventId au royaume vérifié par checkPermission.
 *
 * checkPermission laisse passer un événement introuvable quand la query porte
 * un royaume : sans ce contrôle, un officier lirait ou écrirait les notes
 * d'un événement d'une autre guilde.
 *
 * @returns le raid de l'événement (extension, saison), ou null s'il n'en a pas
 * @throws {BossNoteEventNotFoundError} si l'événement est absent ou hors royaume
 */
export async function findEventRaidInRealm(
  eventId: number,
  realmId: number,
): Promise<EventRaid | null> {
  const event = await bossNoteRepository.findEventInRealm(eventId, realmId);
  if (!event) {
    throw new BossNoteEventNotFoundError();
  }
  return event.raid_difficulty?.raid ?? null;
}
