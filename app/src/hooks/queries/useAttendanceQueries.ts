import { useQuery } from '@tanstack/react-query';

import type {
  AttendanceEventDetail,
  AttendanceFilters,
  AttendanceSummary,
  LootEquityReport,
} from '../../services/attendance.service';
import { attendanceService } from '../../services/attendance.service';

export function useAttendance(filters: AttendanceFilters | null) {
  return useQuery<AttendanceSummary>({
    queryKey: ['attendance', filters],
    queryFn: () => {
      if (!filters) throw new Error('filters required');
      return attendanceService.get(filters);
    },
    enabled: !!filters && !!filters.realmId && !!filters.startDate && !!filters.endDate,
    staleTime: 60_000,
  });
}

export function useCharacterAttendance(
  characterId: number | null,
  filters: AttendanceFilters | null,
) {
  return useQuery<AttendanceEventDetail[]>({
    queryKey: ['attendance', 'character', characterId, filters],
    queryFn: () => {
      if (!characterId || !filters) throw new Error('filters and characterId required');
      return attendanceService.getCharacterDetail(characterId, filters);
    },
    enabled: !!characterId && !!filters?.realmId && !!filters?.startDate && !!filters?.endDate,
    staleTime: 60_000,
  });
}

/** Tableau d'équité du loot (SIMS-201) : réservé aux officiers (ASSIGN_LOOT). */
export function useLootEquity(filters: AttendanceFilters | null, enabled = true) {
  return useQuery<LootEquityReport>({
    queryKey: ['attendance', 'loot-equity', filters],
    queryFn: () => {
      if (!filters) throw new Error('filters required');
      return attendanceService.getLootEquity(filters);
    },
    enabled: enabled && !!filters && !!filters.realmId && !!filters.startDate && !!filters.endDate,
    staleTime: 60_000,
  });
}
