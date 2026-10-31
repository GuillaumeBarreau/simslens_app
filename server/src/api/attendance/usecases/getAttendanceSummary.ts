import { resolveDateRange } from '../attendance.dateRange';
import { MissingIdentifierError } from '../attendance.errors';
import attendanceRepository from '../attendance.repository';
import type {
  AttendancePlayer,
  AttendanceQuery,
  AttendanceSummary,
  AttendanceSummaryRow,
} from '../attendance.types';

function toPlayer(row: AttendanceSummaryRow): AttendancePlayer {
  const total = row.totalRaids || 0;
  const presenceRate = total > 0 ? row.present / total : 0;

  return {
    characterId: row.characterId,
    name: row.name,
    class: row.class,
    spec: row.spec,
    thumbnail: row.thumbnail,
    totalRaids: total,
    present: row.present,
    absent: row.absent,
    pending: row.pending,
    bossAssignments: row.bossAssignments,
    presenceRate: Number(presenceRate.toFixed(4)),
    firstSeenAt: row.firstSeenAt,
  };
}

export async function getAttendanceSummary({
  realmId,
  startDate,
  endDate,
  includeOptional,
}: AttendanceQuery): Promise<AttendanceSummary> {
  if (!realmId || Number.isNaN(realmId)) {
    throw new MissingIdentifierError('realmId');
  }

  const range = resolveDateRange(startDate, endDate, { enforceMaxSpan: true });

  const rows = await attendanceRepository.getAttendanceSummary({
    realmId,
    startDate: range.startDate,
    endDate: range.endDate,
    includeOptional: Boolean(includeOptional),
  });

  return {
    range: {
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
    },
    includeOptional: Boolean(includeOptional),
    eventsCount: rows[0]?.eventsCount ?? 0,
    players: rows.map(toPlayer),
  };
}
