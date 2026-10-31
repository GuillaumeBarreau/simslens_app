/**
 * Reprend la composition d'un raid passé sur un nouvel événement.
 *
 * Les placements existants de l'événement cible ne sont pas effacés : l'import
 * complète, il ne remplace pas.
 */

import { prisma } from '../../../data';
import { EventNotAccessibleError } from '../roster.errors';
import rosterRepository from '../roster.repository';
import { assignToRoster } from './assignToRoster';

export interface ImportRosterResult {
  imported: number;
  skipped: number;
}

export async function importRosterFromEvent(
  targetEventId: number,
  realmId: number,
  sourceEventId: number,
): Promise<ImportRosterResult> {
  const [targetEvent, sourceEvent] = await Promise.all([
    prisma.raid_events.findFirst({ where: { id: targetEventId, realmId } }),
    prisma.raid_events.findFirst({ where: { id: sourceEventId, realmId } }),
  ]);

  if (!targetEvent || !sourceEvent) {
    throw new EventNotAccessibleError();
  }

  const sourceAssignments = await rosterRepository.findAllAssignmentsForImport(sourceEventId);
  if (sourceAssignments.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  const characterIds = [...new Set(sourceAssignments.map((a) => a.characterId))];
  const importable = await findImportableCharacters(characterIds, realmId, targetEventId);

  let imported = 0;
  let skipped = 0;

  for (const assignment of sourceAssignments) {
    if (!importable.has(assignment.characterId)) {
      skipped++;
      continue;
    }

    try {
      await assignToRoster(targetEventId, realmId, {
        characterId: assignment.characterId,
        role: assignment.role,
        bossId: assignment.bossId,
        position: assignment.position,
      });
      imported++;
    } catch {
      // Un placement qui échoue ne doit pas interrompre l'import.
      skipped++;
    }
  }

  return { imported, skipped };
}

/**
 * Personnages que l'on peut replacer : encore actifs sur le royaume, et pas
 * déclarés absents sur l'événement cible.
 */
async function findImportableCharacters(
  characterIds: number[],
  realmId: number,
  targetEventId: number,
): Promise<Set<number>> {
  const [activeCharacters, absentSignups] = await Promise.all([
    prisma.characters.findMany({
      where: { id: { in: characterIds }, realmId, archived: 0 },
      select: { id: true },
    }),
    prisma.raid_signups.findMany({
      where: { eventId: targetEventId, characterId: { in: characterIds }, status: 'ABSENT' },
      select: { characterId: true },
    }),
  ]);

  const absent = new Set(absentSignups.map((s) => s.characterId));

  return new Set(activeCharacters.map((c) => c.id).filter((id) => !absent.has(id)));
}
