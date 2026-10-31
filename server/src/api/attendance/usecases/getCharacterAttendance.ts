import { resolveDateRange } from '../attendance.dateRange';
import { MissingIdentifierError } from '../attendance.errors';
import attendanceRepository from '../attendance.repository';
import type { CharacterAttendanceEvent, CharacterAttendanceQuery } from '../attendance.types';

export async function getCharacterAttendance({
  realmId,
  characterId,
  startDate,
  endDate,
  includeOptional,
}: CharacterAttendanceQuery): Promise<CharacterAttendanceEvent[]> {
  if (!realmId || Number.isNaN(realmId)) {
    throw new MissingIdentifierError('realmId');
  }
  if (!characterId || Number.isNaN(characterId)) {
    throw new MissingIdentifierError('characterId');
  }

  const range = resolveDateRange(startDate, endDate);

  const rows = await attendanceRepository.getCharacterAttendance({
    realmId,
    characterId,
    startDate: range.startDate,
    endDate: range.endDate,
    includeOptional: Boolean(includeOptional),
  });

  return rows.map((row) => ({
    eventId: row.eventId,
    title: row.title,
    startTime: row.startTime,
    isOptional: row.isOptional,
    eventStatus: row.eventStatus,
    signupStatus: row.signupStatus, // PRESENT | LATE | ABSENT | TENTATIVE | BENCH | null
    lateTime: row.lateTime,
    absenceReason: row.absenceReason,
    hasBossAssignment: row.hasBossAssignment,
  }));
}
