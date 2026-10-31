/**
 * Place un personnage sur un boss. Un membre n'occupe qu'un emplacement par
 * boss : placer un de ses personnages retire automatiquement ses autres.
 */

import { prisma } from '../../../data';
import { assertEventInRealm } from '../roster.eventAccess';
import rosterRepository from '../roster.repository';
import type { AssignToRosterInput, RosterAssignmentEntity } from '../roster.types';

export class CharacterNotInRealmError extends Error {
  statusCode = 404;
  code = 'not_found';

  constructor() {
    super('Character not found or not in this realm');
    this.name = 'CharacterNotInRealmError';
  }
}

export async function assignToRoster(
  eventId: number,
  realmId: number,
  { characterId, role, bossId = null, position = 0 }: AssignToRosterInput,
): Promise<RosterAssignmentEntity> {
  await assertEventInRealm(eventId, realmId);

  const character = await prisma.characters.findFirst({ where: { id: characterId, realmId } });
  if (!character) {
    throw new CharacterNotInRealmError();
  }

  if (character.userId) {
    await releaseOtherCharactersOfMember(
      eventId,
      bossId,
      character.userId,
      character.realmId,
      characterId,
    );
  }

  return rosterRepository.upsert({ eventId, characterId, role, bossId, position });
}

/**
 * Libère l'emplacement qu'un autre personnage du même membre occuperait sur
 * ce boss : un membre ne tient qu'un rôle à la fois.
 */
async function releaseOtherCharactersOfMember(
  eventId: number,
  bossId: number | null,
  userId: string,
  realmId: number | null,
  keepCharacterId: number,
): Promise<void> {
  const siblings = await prisma.characters.findMany({
    where: { userId, realmId, id: { not: keepCharacterId } },
    select: { id: true },
  });

  if (siblings.length === 0) return;

  await prisma.event_roster_assignments.deleteMany({
    where: { eventId, bossId, characterId: { in: siblings.map((c) => c.id) } },
  });
}
