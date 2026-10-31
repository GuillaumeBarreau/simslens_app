import type { AbsenceEntity, ListAbsencesFilters } from './absence.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */

export interface CreateAbsenceData {
  userId: string;
  realmId: number;
  startDate: Date;
  endDate: Date;
  reason?: string | null;
}

declare const absenceRepository: {
  findAll(filters: ListAbsencesFilters): Promise<AbsenceEntity[]>;
  findById(id: number): Promise<AbsenceEntity | null>;
  findByUserAndDate(userId: string, realmId: number, date: Date): Promise<AbsenceEntity | null>;
  create(data: CreateAbsenceData): Promise<AbsenceEntity>;
  update(id: number, data: Partial<CreateAbsenceData>): Promise<AbsenceEntity>;
  remove(id: number): Promise<AbsenceEntity>;
  belongsToRealm(id: number, realmId: number, userId?: string | null): Promise<boolean>;
};

export default absenceRepository;
