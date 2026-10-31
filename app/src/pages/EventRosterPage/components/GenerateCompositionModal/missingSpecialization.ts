import type { CompositionContext, CompositionWarning } from 'services/roster.service';

/** Joueur inscrit sans spécialisation, placé ou non par la composition (SIMS-209). */
export interface MissingSpecializationEntry {
  characterId: number;
  name: string;
  /** Rôle d'inscription retenu ; null si le joueur n'a pas pu être placé. */
  role: string | null;
}

/**
 * Joueurs sans spécialisation signalés par une génération : ceux placés avec
 * leur rôle d'inscription, puis ceux laissés de côté faute de rôle.
 */
export function missingSpecializationEntries(
  warnings: CompositionWarning[],
): MissingSpecializationEntry[] {
  const entries: MissingSpecializationEntry[] = [];
  for (const w of warnings) {
    if (w.characterId == null || !w.characterName) continue;
    if (w.type === 'missing_specialization') {
      entries.push({ characterId: w.characterId, name: w.characterName, role: w.role ?? null });
    } else if (w.type === 'unplaced' && w.reason === 'missing_specialization') {
      entries.push({ characterId: w.characterId, name: w.characterName, role: null });
    }
  }
  return entries;
}

/** Nombre de joueurs sans spécialisation dans le contexte, avant génération. */
export function countMissingSpecialization(
  context: Pick<CompositionContext, 'pool' | 'unplaced'>,
): number {
  const placed = context.pool.filter((p) => p.missingSpecialization).length;
  const unplaced = (context.unplaced ?? []).filter(
    (u) => u.reason === 'missing_specialization',
  ).length;
  return placed + unplaced;
}
