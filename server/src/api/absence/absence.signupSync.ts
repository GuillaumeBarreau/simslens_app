/**
 * Répercussion des absences sur les inscriptions.
 *
 * Une absence vaut pour le membre, pas pour un personnage : poser une
 * absence marque ABSENT tous ses personnages du royaume sur les événements
 * de la période, et la retirer efface ces mêmes inscriptions.
 *
 * Ces échecs ne remontent volontairement pas : une inscription impossible à
 * synchroniser ne doit pas faire échouer la pose de l'absence elle-même.
 */

import { prisma } from '../../data';
import eventRepo from '../event/event.repository';
import signupRepo from '../signup/signup.repository';
import type { RealmCharacter } from './absence.types';

interface SyncWindow {
  realmId: number;
  startDate: Date;
  endDate: Date;
  characters: RealmCharacter[];
}

interface EventRow {
  id: number;
}

export async function getUserCharactersInRealm(
  userId: string,
  realmId: number,
): Promise<RealmCharacter[]> {
  return prisma.characters.findMany({
    where: {
      userId: String(userId), // userId is stored as String in DB
      realmId,
      archived: 0,
    },
    select: { id: true, name: true },
  });
}

async function eventsInWindow(
  realmId: number,
  startDate: Date,
  endDate: Date,
): Promise<EventRow[]> {
  return (await eventRepo.findAll({ realmId, startDate, endDate })) as EventRow[];
}

export async function markCharactersAbsent(
  { realmId, startDate, endDate, characters }: SyncWindow,
  reason: string | null,
): Promise<void> {
  const events = await eventsInWindow(realmId, startDate, endDate);

  for (const event of events) {
    for (const character of characters) {
      try {
        await signupRepo.upsert({
          eventId: event.id,
          characterId: character.id,
          status: 'ABSENT',
          absenceReason: reason,
        });
        console.log(`[Absence Service] Set ABSENT for ${character.name} on event ${event.id}`);
      } catch (error) {
        console.error(
          `[Absence Service] Failed to sync signup for event ${event.id}, character ${character.id}:`,
          (error as Error).message,
        );
      }
    }
  }
}

/**
 * Retire les inscriptions ABSENT posées par une absence désormais levée.
 *
 * Une inscription au statut différent est laissée telle quelle : le membre
 * l'a modifiée lui-même entre-temps.
 */
export async function clearAbsentSignups({
  realmId,
  startDate,
  endDate,
  characters,
}: SyncWindow): Promise<void> {
  const events = await eventsInWindow(realmId, startDate, endDate);

  for (const event of events) {
    for (const character of characters) {
      try {
        const existingSignup = await signupRepo.findByEventAndCharacter(event.id, character.id);
        if (existingSignup && existingSignup.status === 'ABSENT') {
          await signupRepo.remove(event.id, character.id);
          console.log(
            `[Absence Service] Removed ABSENT signup for ${character.name} on event ${event.id}`,
          );
        }
      } catch (error) {
        console.error(
          `[Absence Service] Failed to remove signup for event ${event.id}:`,
          (error as Error).message,
        );
      }
    }
  }
}
