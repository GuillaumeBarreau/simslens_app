import { prisma } from '../../data';
import { EventNotAccessibleError } from './roster.errors';

/**
 * @throws {EventNotAccessibleError} si l'événement est absent ou hors royaume
 */
export async function assertEventInRealm(eventId: number, realmId: number): Promise<void> {
  const event = await prisma.raid_events.findFirst({ where: { id: eventId, realmId } });
  if (!event) {
    throw new EventNotAccessibleError();
  }
}

/**
 * Variante qui renvoie la difficulté du raid, dont la lecture de
 * l'historique a besoin.
 *
 * @throws {EventNotAccessibleError} si l'événement est absent ou hors royaume
 */
export async function getEventDifficultyInRealm(
  eventId: number,
  realmId: number,
): Promise<number | null> {
  const event = await prisma.raid_events.findFirst({
    where: { id: eventId, realmId },
    select: { raidDifficultyId: true },
  });

  if (!event) {
    throw new EventNotAccessibleError();
  }

  return event.raidDifficultyId;
}
