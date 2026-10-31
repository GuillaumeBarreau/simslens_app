import type { RosterAssignmentEntity } from './roster.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 *
 * Les lectures joignent le personnage : le type reste volontairement large,
 * la forme exacte dépendant des `include` de chaque requête.
 */
export interface RosterAssignmentWithCharacter extends RosterAssignmentEntity {
  character?: {
    id: number;
    name: string;
    class?: string | null;
    specialization?: { id: number; name: string; role: string | null } | null;
    userId: string | null;
    realmId: number | null;
  } | null;
}

declare const rosterRepository: {
  findByEvent(eventId: number, bossId?: number | null): Promise<RosterAssignmentWithCharacter[]>;
  findOne(
    eventId: number,
    characterId: number,
    bossId?: number | null,
  ): Promise<RosterAssignmentEntity | null>;
  upsert(data: {
    eventId: number;
    characterId: number;
    role: string;
    bossId?: number | null;
    position?: number;
  }): Promise<RosterAssignmentEntity>;
  remove(eventId: number, characterId: number, bossId?: number | null): Promise<unknown>;
  removeAllForEvent(eventId: number): Promise<unknown>;
  removeAllForBoss(eventId: number, bossId: number): Promise<unknown>;
  findPastEventsWithRoster(
    realmId: number,
    raidDifficultyId: number | null,
    excludeEventId: number,
    limit?: number,
  ): Promise<unknown[]>;
  findAllAssignmentsForImport(eventId: number): Promise<RosterAssignmentEntity[]>;
};

export default rosterRepository;
