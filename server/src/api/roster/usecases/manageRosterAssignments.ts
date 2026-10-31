import { prisma } from '../../../data';
import { assertEventInRealm } from '../roster.eventAccess';
import rosterRepository from '../roster.repository';
import { assignToRoster } from './assignToRoster';

export async function removeFromRoster(
  eventId: number,
  characterId: number,
  realmId: number,
  bossId: number | null = null,
): Promise<unknown> {
  await assertEventInRealm(eventId, realmId);

  return rosterRepository.remove(eventId, characterId, bossId);
}

/**
 * Fixe l'ordre d'affichage d'une colonne de rôle : la position de chaque
 * personnage est son rang dans la liste reçue.
 */
export async function reorderRoster(
  eventId: number,
  realmId: number,
  bossId: number | null,
  role: string,
  characterIds: number[],
): Promise<void> {
  await assertEventInRealm(eventId, realmId);

  await Promise.all(
    characterIds.map((characterId, index) =>
      prisma.event_roster_assignments.updateMany({
        where: { eventId, characterId, bossId, role },
        data: { position: index, updatedAt: new Date() },
      }),
    ),
  );
}

export interface CopyRosterResult {
  count: number;
  message?: string;
}

/**
 * Recopie les placements d'un boss vers d'autres boss du même événement.
 *
 * Le boss source est ignoré s'il figure parmi les cibles, pour ne pas
 * recopier une composition sur elle-même.
 */
export async function copyRoster(
  eventId: number,
  realmId: number,
  sourceBossId: number,
  targetBossIds: number[],
): Promise<CopyRosterResult> {
  await assertEventInRealm(eventId, realmId);

  const sourceAssignments = await rosterRepository.findByEvent(eventId, sourceBossId);
  if (sourceAssignments.length === 0) {
    return { count: 0, message: 'No assignments to copy' };
  }

  let count = 0;

  for (const targetBossId of targetBossIds) {
    if (targetBossId === sourceBossId) continue;

    for (const assignment of sourceAssignments) {
      await assignToRoster(eventId, realmId, {
        characterId: assignment.characterId,
        role: assignment.role,
        bossId: targetBossId,
        position: assignment.position,
      });
      count++;
    }
  }

  return { count };
}

export async function clearBossRoster(
  eventId: number,
  realmId: number,
  bossId: number,
): Promise<unknown> {
  await assertEventInRealm(eventId, realmId);

  return rosterRepository.removeAllForBoss(eventId, bossId);
}
