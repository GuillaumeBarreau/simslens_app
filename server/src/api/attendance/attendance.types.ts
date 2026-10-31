export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AttendanceQuery {
  realmId: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  includeOptional?: boolean;
}

export interface CharacterAttendanceQuery extends AttendanceQuery {
  characterId: number;
}

/** Ligne brute renvoyée par le repository pour le résumé. */
export interface AttendanceSummaryRow {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  thumbnail: string | null;
  totalRaids: number;
  present: number;
  absent: number;
  pending: number;
  bossAssignments: number;
  firstSeenAt: Date | null;
  eventsCount: number;
}

export interface AttendancePlayer {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  thumbnail: string | null;
  totalRaids: number;
  present: number;
  absent: number;
  pending: number;
  bossAssignments: number;
  /** Ratio de présence arrondi à quatre décimales. */
  presenceRate: number;
  firstSeenAt: Date | null;
}

export interface AttendanceSummary {
  range: { startDate: string; endDate: string };
  includeOptional: boolean;
  eventsCount: number;
  players: AttendancePlayer[];
}

/** Ligne brute renvoyée par le repository pour le détail d'un personnage. */
export interface CharacterAttendanceRow {
  eventId: number;
  title: string;
  startTime: Date;
  isOptional: boolean;
  eventStatus: string;
  /** PRESENT | LATE | ABSENT | TENTATIVE | BENCH | null */
  signupStatus: string | null;
  lateTime: string | null;
  absenceReason: string | null;
  hasBossAssignment: boolean;
}

export type CharacterAttendanceEvent = CharacterAttendanceRow;
