import { AbsenceNotFoundError } from '../absence.errors';
import absenceRepo from '../absence.repository';
import type { AbsenceEntity, ListAbsencesFilters } from '../absence.types';

export async function listAbsences(filters: ListAbsencesFilters): Promise<AbsenceEntity[]> {
  return absenceRepo.findAll(filters);
}

export async function getAbsenceById(id: number): Promise<AbsenceEntity | null> {
  return absenceRepo.findById(id);
}

/**
 * Lecture restreinte au royaume de l'appelant.
 * @throws {AbsenceNotFoundError} si l'absence n'existe pas ou sort de la portée
 */
export async function getAbsenceForRealm(id: number, realmId: number): Promise<AbsenceEntity> {
  const hasAccess = await absenceRepo.belongsToRealm(id, realmId);
  const absence = hasAccess ? await absenceRepo.findById(id) : null;
  if (!absence) throw new AbsenceNotFoundError();

  return absence;
}
