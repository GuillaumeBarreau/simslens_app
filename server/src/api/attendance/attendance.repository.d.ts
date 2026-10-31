import type { AttendanceSummaryRow, CharacterAttendanceRow } from './attendance.types';

/**
 * Contrat du repository, qui reste écrit en JavaScript.
 * Voir docs/api/architecture.md pour la raison d'être de ce fichier.
 */
declare const attendanceRepository: {
  getAttendanceSummary(params: {
    realmId: number;
    startDate: Date;
    endDate: Date;
    includeOptional: boolean;
  }): Promise<AttendanceSummaryRow[]>;
  getCharacterAttendance(params: {
    realmId: number;
    characterId: number;
    startDate: Date;
    endDate: Date;
    includeOptional: boolean;
  }): Promise<CharacterAttendanceRow[]>;
};

export default attendanceRepository;
