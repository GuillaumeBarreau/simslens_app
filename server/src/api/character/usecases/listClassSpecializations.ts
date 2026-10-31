/**
 * Classes et spécialisations : données de référence (SIMS-212).
 *
 * Remplace la copie que le front gardait en dur (`app/src/data/specializations.ts`).
 * Les noms de spé sont ceux de la base (anglais) : le front les traduit.
 */

import characterRepository from '../character.repository';

export interface ClassSpecializationsOutput {
  id: number;
  /** Nom normalisé (`death_knight`). */
  name: string;
  specializations: {
    id: number;
    name: string;
    classId: number;
    role: string;
    icon: string | null;
  }[];
}

export async function listClassSpecializations(): Promise<ClassSpecializationsOutput[]> {
  return (await characterRepository.listClassesWithSpecializations()) as ClassSpecializationsOutput[];
}
