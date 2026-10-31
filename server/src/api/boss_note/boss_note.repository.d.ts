import type { BossNoteWithAssignments } from './boss_note.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

export interface EventWithRaid {
  id: number;
  raid_difficulty: { raid: { extension: string | null; season: string | null } } | null;
}

export interface BossRow {
  id: number;
  extension: string;
  season: string;
}

export interface HolderRow {
  characterId: number;
  bossId: number | null;
}

export interface ReplaceNoteData {
  content: string;
  updatedBy: string;
  assignments: { characterId: number; task: string }[];
}

declare const bossNoteRepository: {
  findEventInRealm(eventId: number, realmId: number): Promise<EventWithRaid | null>;
  findBossById(bossId: number): Promise<BossRow | null>;
  findHolders(eventId: number, bossId?: number | null): Promise<HolderRow[]>;
  findByEvent(eventId: number): Promise<BossNoteWithAssignments[]>;
  replace(eventId: number, bossId: number, data: ReplaceNoteData): Promise<BossNoteWithAssignments>;
  removeByBoss(eventId: number, bossId: number): Promise<{ count: number }>;
};

export default bossNoteRepository;
