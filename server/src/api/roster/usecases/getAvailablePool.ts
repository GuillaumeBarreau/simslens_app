/**
 * Personnages que l'on peut placer sur un événement : ceux dont le membre
 * s'est inscrit, leurs rerolls compris.
 *
 * Ce fichier ne fait que rassembler les données ; l'enrichissement et le
 * classement vivent dans roster.availability, et sont testés à part.
 */

import { prisma } from '../../../data';
import {
  AVAILABLE_SIGNUP_STATUSES,
  enrichCharacter,
  groupAndSortByUser,
  userKeyOf,
} from '../roster.availability';
import rosterRepository from '../roster.repository';
import type { EnrichedPoolCharacter, PoolCharacter, SignupInfo } from '../roster.types';

const CHARACTER_SELECTION = {
  id: true,
  name: true,
  class: true,
  specialization: { select: { id: true, name: true, role: true } },
  userId: true,
  realmId: true,
} as const;

export async function getAvailablePool(
  eventId: number,
  realmId: number,
  bossId: number | null = null,
): Promise<EnrichedPoolCharacter[]> {
  const signups = await prisma.raid_signups.findMany({
    where: {
      eventId,
      status: { in: [...AVAILABLE_SIGNUP_STATUSES] },
      event: { realmId },
    },
    include: { character: { select: CHARACTER_SELECTION } },
  });

  const signupsByCharacterId = new Map<number, SignupInfo>();
  const signedUpUserIds = new Set<string>();

  for (const signup of signups) {
    if (signup.character?.userId) {
      signedUpUserIds.add(signup.character.userId);
    }
    signupsByCharacterId.set(signup.characterId, {
      status: signup.status,
      role: signup.role,
      lateTime: signup.lateTime || null,
    });
  }

  // Tous les personnages des membres inscrits, rerolls compris : un membre
  // inscrit avec son main peut être placé avec un autre de ses personnages.
  const candidates = (await prisma.characters.findMany({
    where: { realmId, userId: { in: Array.from(signedUpUserIds) } },
    select: CHARACTER_SELECTION,
  })) as PoolCharacter[];

  const assignments = await rosterRepository.findByEvent(eventId, bossId);
  const assignedNameByUserKey = new Map<string, string>();
  for (const assignment of assignments) {
    if (assignment.character?.userId) {
      const key = userKeyOf(assignment.character as PoolCharacter);
      if (key) assignedNameByUserKey.set(key, assignment.character.name);
    }
  }

  const charactersInConcurrentEvents = await findCharactersInConcurrentEvents(eventId, realmId);

  const context = { signupsByCharacterId, assignedNameByUserKey, charactersInConcurrentEvents };

  return groupAndSortByUser(candidates.map((character) => enrichCharacter(character, context)));
}

/**
 * Personnages déjà placés sur un raid du royaume qui chevauche celui-ci.
 *
 * Purement informatif : l'interface le signale sans interdire le placement.
 */
async function findCharactersInConcurrentEvents(
  eventId: number,
  realmId: number,
): Promise<Set<number>> {
  const currentEvent = await prisma.raid_events.findUnique({
    where: { id: eventId },
    select: { startTime: true, endTime: true },
  });

  if (!currentEvent) return new Set();

  const concurrentEvents = await prisma.raid_events.findMany({
    where: {
      realmId,
      id: { not: eventId },
      status: { not: 'CANCELLED' },
      startTime: { lt: currentEvent.endTime },
      endTime: { gt: currentEvent.startTime },
    },
    select: { id: true },
  });

  if (concurrentEvents.length === 0) return new Set();

  const assignments = await prisma.event_roster_assignments.findMany({
    where: { eventId: { in: concurrentEvents.map((e) => e.id) } },
    select: { characterId: true },
  });

  return new Set(assignments.map((a) => a.characterId));
}
