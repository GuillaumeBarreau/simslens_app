/**
 * Notes et assignations de chaque boss d'un événement, pour les joueurs comme
 * pour les officiers.
 */

import { findEventRaidInRealm } from '../boss_note.access';
import bossNoteRepository from '../boss_note.repository';
import { holdersByBoss, toBossNoteView } from '../boss_note.rules';
import type { BossNoteView } from '../boss_note.types';

export async function listBossNotes(eventId: number, realmId: number): Promise<BossNoteView[]> {
  await findEventRaidInRealm(eventId, realmId);

  const [notes, rows] = await Promise.all([
    bossNoteRepository.findByEvent(eventId),
    bossNoteRepository.findHolders(eventId),
  ]);
  const holders = holdersByBoss(rows);

  return notes.map((note) => toBossNoteView(note, holders.get(note.bossId) ?? new Set()));
}
