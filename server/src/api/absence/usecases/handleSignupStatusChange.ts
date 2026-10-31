/**
 * Quand un membre quitte le statut ABSENT sur un événement, l'absence qui
 * couvrait ce jour n'a plus lieu d'être : elle est levée.
 *
 * Aucun cas d'échec n'est remonté — l'appelant met à jour une inscription,
 * pas une absence.
 */

import { prisma } from '../../../data';
import absenceRepo from '../absence.repository';

export interface SignupRef {
  eventId: number;
  characterId: number;
}

export async function handleSignupStatusChange(
  signup: SignupRef,
  newStatus: string,
): Promise<void> {
  console.log('[Absence Service] handleSignupStatusChange called with:', {
    signupEventId: signup.eventId,
    signupCharacterId: signup.characterId,
    newStatus,
  });

  if (newStatus === 'ABSENT') {
    console.log('[Absence Service] New status is ABSENT, skipping');
    return;
  }

  const event = await prisma.raid_events.findUnique({
    where: { id: signup.eventId },
    select: { startTime: true, realmId: true },
  });

  if (!event) {
    console.log('[Absence Service] Event not found');
    return;
  }

  const character = await prisma.characters.findUnique({
    where: { id: signup.characterId },
    select: { userId: true },
  });

  if (!character) {
    console.log('[Absence Service] Character not found');
    return;
  }

  // Un personnage non rattaché à un compte ne peut porter aucune absence :
  // celles-ci sont posées par membre, pas par personnage.
  if (!character.userId) {
    console.log('[Absence Service] Character is not linked to a user');
    return;
  }

  console.log('[Absence Service] Event found:', { startTime: event.startTime });

  const eventDate = new Date(event.startTime);
  eventDate.setHours(0, 0, 0, 0);

  console.log('[Absence Service] Looking for absence on date:', eventDate.toISOString());

  const absence = await absenceRepo.findByUserAndDate(character.userId, event.realmId, eventDate);

  if (!absence) {
    console.log('[Absence Service] No absence found for this date');
    return;
  }

  console.log('[Absence Service] Found absence:', {
    id: absence.id,
    startDate: absence.startDate,
    endDate: absence.endDate,
  });

  await absenceRepo.remove(absence.id);
  console.log(
    `[Absence Service] Removed absence ${absence.id} for date ${eventDate.toISOString()}`,
  );
}
