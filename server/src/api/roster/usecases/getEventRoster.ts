import { prisma } from '../../../data';
import { RAID_ROLES } from '../../../shared/constants/roles';
import { EventNotAccessibleError } from '../roster.errors';
import type { RosterAssignmentWithCharacter } from '../roster.repository';
import rosterRepository from '../roster.repository';

export interface GroupedRoster {
  tanks: RosterAssignmentWithCharacter[];
  healers: RosterAssignmentWithCharacter[];
  melee: RosterAssignmentWithCharacter[];
  ranged: RosterAssignmentWithCharacter[];
  counts: {
    tanks: number;
    healers: number;
    melee: number;
    ranged: number;
    total: number;
  };
}

export async function getEventRoster(
  eventId: number,
  realmId: number,
  bossId: number | null = null,
): Promise<GroupedRoster> {
  console.log('[Roster Service] getEventRoster called:', { eventId, realmId, bossId });

  const event = await prisma.raid_events.findFirst({ where: { id: eventId, realmId } });
  if (!event) {
    throw new EventNotAccessibleError();
  }

  const assignments = await rosterRepository.findByEvent(eventId, bossId);
  console.log('[Roster Service] Found assignments:', assignments.length, 'for bossId:', bossId);

  const grouped = Object.fromEntries(
    RAID_ROLES.map((role) => [role, [] as RosterAssignmentWithCharacter[]]),
  ) as Record<string, RosterAssignmentWithCharacter[]>;

  for (const assignment of assignments) {
    // Un placement dont le rôle n'est plus un rôle de raid est ignoré.
    grouped[assignment.role]?.push(assignment);
  }

  return {
    tanks: grouped.TANK,
    healers: grouped.HEALER,
    melee: grouped.MELEE,
    ranged: grouped.RANGED,
    counts: {
      tanks: grouped.TANK.length,
      healers: grouped.HEALER.length,
      melee: grouped.MELEE.length,
      ranged: grouped.RANGED.length,
      total: assignments.length,
    },
  };
}
