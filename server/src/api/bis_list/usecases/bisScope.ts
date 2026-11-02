import { catalogSeasons } from '../../../shared/game/catalogScope';
import { specializationLabel } from '../../../shared/game/games';
import { InvalidBisSpecializationError, UnknownSeasonError } from '../bis.errors';
import bisRepository from '../bis.repository';

/**
 * Contrôles communs : la spé existe et WoW Forever la propose ; le palier est
 * connu. Renvoie la spé et les paliers jusqu'au courant inclus.
 */
export async function resolveBisScope(specializationId: number, season: string) {
  let seasons: string[];
  try {
    seasons = catalogSeasons('forever', season);
  } catch {
    throw new UnknownSeasonError(season);
  }

  const spec = await bisRepository.findSpecialization(specializationId);
  if (!spec || specializationLabel('forever', spec.class.name, spec.name) === null) {
    throw new InvalidBisSpecializationError();
  }
  return { spec, seasons };
}
