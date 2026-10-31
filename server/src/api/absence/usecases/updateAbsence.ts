/**
 * Modifie une absence et, si la période change, repose le statut ABSENT sur
 * les événements de la nouvelle fenêtre.
 */

import { AbsenceNotFoundError } from '../absence.errors';
import absenceRepo from '../absence.repository';
import { getUserCharactersInRealm, markCharactersAbsent } from '../absence.signupSync';
import type { AbsenceEntity, AbsenceScope, UpdateAbsenceInput } from '../absence.types';

export async function updateAbsence(id: number, data: UpdateAbsenceInput): Promise<AbsenceEntity> {
  const existing = await absenceRepo.findById(id);
  if (!existing) {
    throw new AbsenceNotFoundError();
  }

  const absence = await absenceRepo.update(id, data);

  const periodChanged = Boolean(data.startDate || data.endDate);
  if (periodChanged) {
    const characters = await getUserCharactersInRealm(existing.userId, existing.realmId);

    await markCharactersAbsent(
      {
        realmId: existing.realmId,
        startDate: data.startDate || existing.startDate,
        endDate: data.endDate || existing.endDate,
        characters,
      },
      data.reason || existing.reason || null,
    );
  }

  return absence;
}

/**
 * Modification restreinte au royaume et au membre appelants.
 * @throws {AbsenceNotFoundError} si l'absence sort de la portée
 */
export async function updateAbsenceForRealm(
  id: number,
  { realmId, userId }: AbsenceScope,
  data: UpdateAbsenceInput,
): Promise<AbsenceEntity> {
  const hasAccess = await absenceRepo.belongsToRealm(id, realmId, userId);
  if (!hasAccess) throw new AbsenceNotFoundError();

  return updateAbsence(id, data);
}
