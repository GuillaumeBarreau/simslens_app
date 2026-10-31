/**
 * Règles des notes de boss, sans accès à la base : testées seules.
 */

import type {
  BossNoteAssignmentInput,
  BossNoteView,
  BossNoteWithAssignments,
  SaveBossNoteInput,
} from './boss_note.types';

export interface EventRaid {
  extension: string | null;
  season: string | null;
}

export interface BossRef {
  extension: string;
  season: string;
}

/**
 * Un boss appartient à l'événement s'il est de l'extension et de la saison du
 * raid de l'événement : c'est ainsi que le roster liste ses boss
 * (`bosses` n'a pas de lien direct vers `raids`, voir
 * docs/database/conventions.md). Un événement sans raid connu accepte tout
 * boss existant, comme le roster.
 */
export function isBossOfEvent(boss: BossRef, raid: EventRaid | null): boolean {
  if (!raid || !raid.extension || !raid.season) return true;
  return boss.extension === raid.extension && boss.season === raid.season;
}

/**
 * Nettoie la saisie : tâches rognées, lignes sans tâche ignorées.
 */
export function normalizeInput(input: SaveBossNoteInput): SaveBossNoteInput {
  const assignments: BossNoteAssignmentInput[] = input.assignments
    .map((a) => ({ characterId: a.characterId, task: a.task.trim() }))
    .filter((a) => a.task.length > 0);
  return { content: input.content.trim(), assignments };
}

/** Une note sans texte ni assignation est supprimée plutôt qu'enregistrée vide. */
export function isEmptyNote(input: SaveBossNoteInput): boolean {
  return input.content.length === 0 && input.assignments.length === 0;
}

/**
 * Personnages assignés qui ne sont pas titulaires du boss, sans doublon,
 * dans l'ordre de la saisie.
 */
export function findNonHolders(
  assignments: BossNoteAssignmentInput[],
  holderIds: ReadonlySet<number>,
): number[] {
  const missing = assignments.map((a) => a.characterId).filter((id) => !holderIds.has(id));
  return [...new Set(missing)];
}

/**
 * Forme renvoyée au front. `holderIds` : titulaires actuels du boss. Une
 * assignation dont le personnage a quitté le roster du boss depuis reste
 * affichée, signalée par `isHolder: false`, pour que l'officier la corrige.
 */
export function toBossNoteView(
  note: BossNoteWithAssignments,
  holderIds: ReadonlySet<number>,
): BossNoteView {
  return {
    eventId: note.eventId,
    bossId: note.bossId,
    content: note.content,
    updatedAt: note.updatedAt,
    assignments: [...note.assignments]
      .sort((a, b) => a.position - b.position)
      .map((a) => ({
        characterId: a.characterId,
        characterName: a.character?.name ?? `#${a.characterId}`,
        characterClass: a.character?.class ?? null,
        task: a.task,
        position: a.position,
        isHolder: holderIds.has(a.characterId),
      })),
  };
}

export function holdersByBoss(
  rows: { characterId: number; bossId: number | null }[],
): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const row of rows) {
    if (row.bossId === null) continue;
    const set = map.get(row.bossId) ?? new Set<number>();
    set.add(row.characterId);
    map.set(row.bossId, set);
  }
  return map;
}
