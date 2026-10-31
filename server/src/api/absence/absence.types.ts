import type { member_absences } from '@prisma/client';

export type AbsenceEntity = member_absences;

export interface ListAbsencesFilters {
  realmId: AbsenceEntity['realmId'];
  userId?: AbsenceEntity['userId'];
  startDate?: Date;
  endDate?: Date;
}

export interface CreateAbsenceInput {
  userId: AbsenceEntity['userId'];
  realmId: AbsenceEntity['realmId'];
  startDate: Date;
  endDate: Date;
  reason?: AbsenceEntity['reason'];
}

export interface UpdateAbsenceInput {
  startDate?: Date;
  endDate?: Date;
  reason?: AbsenceEntity['reason'];
}

/**
 * Portée d'un appel : un membre n'agit que sur ses propres absences, dans
 * le royaume courant.
 */
export interface AbsenceScope {
  realmId: AbsenceEntity['realmId'];
  userId?: AbsenceEntity['userId'];
}

export interface RealmCharacter {
  id: number;
  name: string;
}
