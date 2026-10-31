import type { event_boss_note_assignments, event_boss_notes } from '@prisma/client';

export type BossNoteEntity = event_boss_notes;
export type BossNoteAssignmentEntity = event_boss_note_assignments;

export interface BossNoteWithAssignments extends BossNoteEntity {
  assignments: (BossNoteAssignmentEntity & {
    character: { id: number; name: string; class: string } | null;
  })[];
}

/** Assignation soumise : un titulaire du boss et sa tâche. */
export interface BossNoteAssignmentInput {
  characterId: number;
  task: string;
}

export interface SaveBossNoteInput {
  content: string;
  assignments: BossNoteAssignmentInput[];
}

export interface BossNoteAssignmentView {
  characterId: number;
  characterName: string;
  characterClass: string | null;
  task: string;
  position: number;
  /** false si le personnage n'est plus titulaire du boss depuis l'assignation. */
  isHolder: boolean;
}

export interface BossNoteView {
  eventId: number;
  bossId: number;
  content: string;
  updatedAt: Date;
  assignments: BossNoteAssignmentView[];
}
