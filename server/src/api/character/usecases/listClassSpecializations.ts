/**
 * Classes et spécialisations : données de référence (SIMS-212).
 *
 * Remplace la copie que le front gardait en dur (`app/src/data/specializations.ts`).
 * Les noms de spé sont ceux de la base (anglais) : le front les traduit.
 *
 * Avec un jeu (SIMS-027), seules ses classes et spés sont servies, chacune avec son
 * `label` propre au jeu (WoW Forever : « Combat » pour Outlaw…). Le `name` reste le
 * nom en base : les identifiants et noms de spé sont partagés entre les jeux.
 */

import type { GameId } from '../../../shared/game/games';
import { specializationLabel } from '../../../shared/game/games';
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
    /** Libellé propre au jeu demandé ; absent sans paramètre `game`. */
    label?: string;
  }[];
}

/** Restreint la liste aux classes et spés du jeu, avec leur libellé. */
export function filterForGame(
  classes: ClassSpecializationsOutput[],
  game: GameId,
): ClassSpecializationsOutput[] {
  return classes.flatMap((cls) => {
    const specializations = cls.specializations.flatMap((spec) => {
      const label = specializationLabel(game, cls.name, spec.name);
      return label === null ? [] : [{ ...spec, label }];
    });
    return specializations.length > 0 ? [{ ...cls, specializations }] : [];
  });
}

export async function listClassSpecializations(
  game?: GameId,
): Promise<ClassSpecializationsOutput[]> {
  const classes =
    (await characterRepository.listClassesWithSpecializations()) as ClassSpecializationsOutput[];
  return game ? filterForGame(classes, game) : classes;
}
