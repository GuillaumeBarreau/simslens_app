/**
 * Lève une absence et efface les inscriptions ABSENT qu'elle avait posées.
 */

import { AbsenceNotFoundError } from '../absence.errors';
import absenceRepo from '../absence.repository';
import { clearAbsentSignups, getUserCharactersInRealm } from '../absence.signupSync';
import type { AbsenceEntity, AbsenceScope } from '../absence.types';

export async function removeAbsence(id: number): Promise<AbsenceEntity> {
  const absence = await absenceRepo.findById(id);
  if (!absence) {
    throw new AbsenceNotFoundError();
  }

  const characters = await getUserCharactersInRealm(absence.userId, absence.realmId);

  await clearAbsentSignups({
    realmId: absence.realmId,
    startDate: absence.startDate,
    endDate: absence.endDate,
    characters,
  });

  return absenceRepo.remove(id);
}

/**
 * Suppression restreinte au royaume et au membre appelants.
 * @throws {AbsenceNotFoundError} si l'absence sort de la portée
 */
export async function removeAbsenceForRealm(
  id: number,
  { realmId, userId }: AbsenceScope,
): Promise<AbsenceEntity> {
  const hasAccess = await absenceRepo.belongsToRealm(id, realmId, userId);
  if (!hasAccess) throw new AbsenceNotFoundError();

  return removeAbsence(id);
}
