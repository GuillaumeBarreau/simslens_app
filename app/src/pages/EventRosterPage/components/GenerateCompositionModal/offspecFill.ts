import type { CompositionWarning } from 'services/roster.service';

/** Joueur placé hors de sa spé principale par la composition (SIMS-222). */
export interface OffspecFillEntry {
  characterId: number;
  name: string;
  /** Rôle tenu dans la composition. */
  role: string;
  /** Rôle de la spé principale du joueur. */
  primaryRole: string;
  /** Nombre de boss sur lesquels il tient ce rôle hors spé. */
  bossCount: number;
}

/**
 * Postes comblés hors spé, regroupés par joueur et par rôle : le serveur émet
 * un avertissement `role_offspec_fill` par boss.
 */
export function offspecFillEntries(warnings: CompositionWarning[]): OffspecFillEntry[] {
  const entries = new Map<string, OffspecFillEntry>();
  for (const w of warnings) {
    if (w.type !== 'role_offspec_fill') continue;
    if (w.characterId == null || !w.characterName || !w.role || !w.primaryRole) continue;
    const key = `${w.characterId}:${w.role}`;
    const entry = entries.get(key);
    if (entry) {
      entry.bossCount += 1;
    } else {
      entries.set(key, {
        characterId: w.characterId,
        name: w.characterName,
        role: w.role,
        primaryRole: w.primaryRole,
        bossCount: 1,
      });
    }
  }
  return [...entries.values()];
}
