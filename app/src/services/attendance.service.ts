import type { SimMetric } from '../utils/droptimizer';
import { apiClient } from './api.client';

export interface AttendancePlayer {
  characterId: number;
  name: string;
  class: string;
  spec?: string;
  thumbnail?: string;
  totalRaids: number;
  present: number;
  absent: number;
  pending: number;
  bossAssignments: number;
  presenceRate: number;
  firstSeenAt: string | null;
}

export interface AttendanceSummary {
  range: { startDate: string; endDate: string };
  includeOptional: boolean;
  eventsCount: number;
  players: AttendancePlayer[];
}

export interface AttendanceFilters {
  realmId: number;
  startDate: string;
  endDate: string;
  includeOptional: boolean;
}

export type SignupStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'TENTATIVE' | 'BENCH';

export interface AttendanceEventDetail {
  eventId: number;
  title: string;
  startTime: string;
  isOptional: boolean;
  eventStatus: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  signupStatus: SignupStatus | null;
  lateTime: string | null;
  absenceReason: string | null;
  hasBossAssignment: boolean;
}

export type RaidRole = 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';

export interface LootEquityItem {
  lootId: number;
  itemId: number | null;
  itemName: string | null;
  itemIcon: string | null;
  receivedAt: string;
  response: string | null;
  instance: string | null;
  /** Gain simulé en % au moment du drop ; `null` = inconnu. */
  gainPercent: number | null;
  /** Grandeur du gain (SIMS-202) : % de HPS (QE Live) ou de DPS ; null si inconnu. */
  gainMetric?: SimMetric | null;
  simulatedAt: string | null;
  /**
   * `frozen` : figé à l'import du loot (SIMS-229) ; `estimated` : recalculé
   * depuis le sim courant (drops plus anciens) ; `null` : gain inconnu.
   */
  gainSource: 'frozen' | 'estimated' | null;
  isBis: boolean;
}

export interface LootEquityPlayer {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  role: RaidRole;
  thumbnail: string | null;
  itemsReceived: number;
  items: LootEquityItem[];
  knownGainCount: number;
  /**
   * Grandeur des gains moyenne et cumul (SIMS-202) : ceux d'une autre grandeur
   * n'y entrent pas. null sans gain connu.
   */
  gainMetric?: SimMetric | null;
  averageGainPercent: number | null;
  cumulativeGainPercent: number | null;
  bisReceived: number;
  bisObtained: number;
  bisTotal: number;
  bisFillRate: number | null;
  present: number;
  totalRaids: number;
  presenceRate: number | null;
}

export interface LootEquityReport {
  range: { startDate: string; endDate: string };
  includeOptional: boolean;
  eventsCount: number;
  players: LootEquityPlayer[];
}

class AttendanceService {
  async get(filters: AttendanceFilters): Promise<AttendanceSummary> {
    const params = new URLSearchParams({
      realmId: String(filters.realmId),
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeOptional: filters.includeOptional ? 'true' : 'false',
    });
    const { data } = await apiClient.get(`/1/attendance?${params.toString()}`);
    return data;
  }

  async getCharacterDetail(
    characterId: number,
    filters: AttendanceFilters,
  ): Promise<AttendanceEventDetail[]> {
    const params = new URLSearchParams({
      realmId: String(filters.realmId),
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeOptional: filters.includeOptional ? 'true' : 'false',
    });
    const { data } = await apiClient.get(
      `/1/attendance/character/${characterId}?${params.toString()}`,
    );
    return data.events;
  }

  /** Tableau d'équité du loot (SIMS-201), réservé aux officiers. */
  async getLootEquity(filters: AttendanceFilters): Promise<LootEquityReport> {
    const params = new URLSearchParams({
      realmId: String(filters.realmId),
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeOptional: filters.includeOptional ? 'true' : 'false',
    });
    const { data } = await apiClient.get(`/1/attendance/loot-equity?${params.toString()}`);
    return data;
  }
}

export const attendanceService = new AttendanceService();
