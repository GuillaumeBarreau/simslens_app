/**
 * Spé simulée retenue par l'optimiseur de loot (SIMS-234).
 *
 * `POST /upgrade/batch` et `/upgrade/wishlist-batch` ne gardent qu'une spé par
 * personnage (sa spé principale, sinon la dernière simulée) et la renvoient
 * sur chaque ligne dans `simSpecialization`.
 */

export interface SimulatedSpecialization {
  id: number;
  /** Nom anglais, tel qu'en base (à traduire avec useSpecializationLabel). */
  name: string;
  icon?: string | null;
  role?: string | null;
}

interface RowWithSimulatedSpec {
  characterId?: number;
  name?: string;
  simSpecialization?: SimulatedSpecialization | null;
  /** Libellé brut de la sim (« Elemental Shaman »), repli si la spé est inconnue. */
  spec?: string | null;
}

/** Nom de la spé simulée d'une ligne : la spé retenue, sinon le libellé brut de la sim. */
export function simulatedSpecName(row: RowWithSimulatedSpec | null | undefined): string | null {
  return row?.simSpecialization?.name ?? (row?.spec || null);
}

/**
 * Nom de la spé simulée d'un joueur dans les lignes de plusieurs objets : la
 * première ligne du joueur qui en porte une (la spé retenue est la même sur
 * toutes ses lignes).
 */
export function playerSimulatedSpecName(
  rowsByItem: Record<string | number, RowWithSimulatedSpec[] | undefined>,
  player: { id: number; name: string },
): string | null {
  for (const rows of Object.values(rowsByItem)) {
    for (const row of rows ?? []) {
      if (row.characterId !== player.id && row.name !== player.name) continue;
      const name = simulatedSpecName(row);
      if (name) return name;
    }
  }
  return null;
}
