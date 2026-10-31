/**
 * Enregistre la note d'un boss et remplace ses assignations. Chaque personnage
 * assigné doit être titulaire du boss sur cet événement. Une note vidée (sans
 * texte ni assignation) est supprimée.
 */

import { findEventRaidInRealm } from '../boss_note.access';
import { AssigneeNotHolderError, InvalidBossError } from '../boss_note.errors';
import bossNoteRepository from '../boss_note.repository';
import {
  findNonHolders,
  holdersByBoss,
  isBossOfEvent,
  isEmptyNote,
  normalizeInput,
  toBossNoteView,
} from '../boss_note.rules';
import type { BossNoteView, SaveBossNoteInput } from '../boss_note.types';

export interface SaveBossNoteParams {
  eventId: number;
  bossId: number;
  /** Royaume vérifié par checkPermission. */
  realmId: number;
  userId: string;
  input: SaveBossNoteInput;
}

/**
 * @returns la note enregistrée, ou null si elle a été vidée puis supprimée
 * @throws {BossNoteEventNotFoundError} événement absent ou hors royaume
 * @throws {InvalidBossError} boss inconnu ou hors du raid de l'événement
 * @throws {AssigneeNotHolderError} personnage assigné absent du roster du boss
 */
export async function saveBossNote({
  eventId,
  bossId,
  realmId,
  userId,
  input,
}: SaveBossNoteParams): Promise<BossNoteView | null> {
  const raid = await findEventRaidInRealm(eventId, realmId);

  const boss = await bossNoteRepository.findBossById(bossId);
  if (!boss || !isBossOfEvent(boss, raid)) {
    throw new InvalidBossError();
  }

  const clean = normalizeInput(input);
  if (isEmptyNote(clean)) {
    await bossNoteRepository.removeByBoss(eventId, bossId);
    return null;
  }

  const holders = holdersByBoss(await bossNoteRepository.findHolders(eventId, bossId));
  const holderIds = holders.get(bossId) ?? new Set<number>();
  const nonHolders = findNonHolders(clean.assignments, holderIds);
  if (nonHolders.length > 0) {
    throw new AssigneeNotHolderError(nonHolders);
  }

  const note = await bossNoteRepository.replace(eventId, bossId, {
    content: clean.content,
    updatedBy: userId,
    assignments: clean.assignments,
  });
  return toBossNoteView(note, holderIds);
}
