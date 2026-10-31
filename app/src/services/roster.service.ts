import { apiClient } from './api.client';

export interface RosterAssignment {
  id: number;
  eventId: number;
  characterId: number;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  bossId: number | null;
  position: number;
  character: {
    id: number;
    name: string;
    class: string;
    specialization?: {
      id: number;
      name: string;
      role: string;
    };
    userId?: string;
  };
}

/**
 * Pool character (signed up or belonging to signed-up user)
 */
export interface PoolCharacter {
  id: number;
  name: string;
  class: string;
  specialization?: {
    id: number;
    name: string;
    role: string;
  };
  userId?: string | null;
  /** 'ABSENT' is added client-side for guild members not in the event pool */
  signupStatus: 'PRESENT' | 'LATE' | 'TENTATIVE' | 'INHERITED' | 'ABSENT';
  signupRole?: string | null;
  isDirectSignup?: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  inConcurrentEvent?: boolean;
  assignedCharacterName?: string | null;
  /** True if the player has signed up (or is assigned); false = guild member shown as absent */
  isSignee?: boolean;
  thumbnail?: string | null;
  ilvl?: number | null;
  score?: number | null;
  lastModified?: string | number;
  recentReportId?: string | null;
  recentReportTimestamp?: string | number | null;
  lateTime?: string | null;
}

export interface EventRosterResponse {
  tanks: RosterAssignment[];
  healers: RosterAssignment[];
  melee: RosterAssignment[];
  ranged: RosterAssignment[];
  counts: {
    tanks: number;
    healers: number;
    melee: number;
    ranged: number;
    total: number;
  };
}

export interface AssignToRosterPayload {
  characterId: number;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  bossId?: number | null;
  position?: number;
}

export interface PastRosterCharacter {
  id: number;
  name: string;
  class: string;
}

export interface CompositionWeights {
  buffs: number;
  upgrades: number;
  history: number;
}

export interface CompositionAssignment {
  characterId: number;
  characterName: string;
  class: string;
  spec: string | null;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  position: number;
  score: number;
  reason: string;
  /** Poste tenu hors de la spé principale du joueur (SIMS-222). */
  offspec?: boolean;
}

export interface CompositionWarning {
  type:
    | 'buff_uncovered'
    | 'role_short'
    | 'role_offspec_fill'
    | 'empty_pool'
    | 'no_bosses'
    | 'no_bosses_selected'
    | 'player_below_min'
    | 'missing_specialization'
    | 'unplaced';
  /** Raison d'un joueur non placé (`unplaced`). */
  reason?: CompositionUnplacedReason;
  bossId?: number;
  buff?: string;
  role?: string;
  target?: number;
  /** `role_short` : candidats dont c'est le rôle principal. */
  available?: number;
  /** `role_short` : candidats qui ne tiennent le rôle qu'hors spé. */
  offspecAvailable?: number;
  /** `role_offspec_fill` : rôle de la spé principale du joueur. */
  primaryRole?: string;
  characterId?: number;
  characterName?: string;
  assigned?: number;
}

export interface CompositionRoleTargets {
  TANK: number;
  HEALER: number;
  MELEE: number;
  RANGED: number;
}

export interface CompositionBossResult {
  boss: { id: number; name: string; order?: number; icon?: string | null };
  assignments: CompositionAssignment[];
  warnings: CompositionWarning[];
  roleTargets?: CompositionRoleTargets;
  roleSource?: 'history' | 'default';
}

export type CompositionUnplacedReason = 'missing_specialization';

/** Inscrit présent que la composition n'a pas pu placer (SIMS-209). */
export interface CompositionUnplaced {
  characterId: number;
  name: string;
  class: string;
  reason: CompositionUnplacedReason;
}

export interface CompositionResult {
  bosses: CompositionBossResult[];
  warnings: CompositionWarning[];
  unplaced?: CompositionUnplaced[];
  meta: {
    poolSize: number;
    cap: number;
    historyEvents: number;
    activeBuffs: string[];
    difficulty: string;
    raid: { id: number; name: string; extension: string | null; season: string | null };
    bossesAnalyzed?: number;
    bossesWithHistoricalRoles?: number;
    minBossesPerPlayer?: number;
  };
}

export interface GenerateCompositionPayload {
  weights?: Partial<CompositionWeights>;
  sizeOverride?: number;
  healerRatio?: number;
  historyWeeks?: number;
  selectedBossIds?: number[];
  minBossesPerPlayer?: number;
  /** Optional pre-built context to avoid re-fetching on the server. */
  context?: CompositionContext | null;
}

export interface CompositionContextBuff {
  key: string;
  providers: string[];
  enabled: boolean;
}

export interface CompositionContextBoss {
  id: number;
  name: string;
  order: number;
  icon: string | null;
  raidName: string | null;
  historicalRoleTargets: CompositionRoleTargets | null;
  historicalRoleSamples: number;
  /** What the algorithm will use: history if available, else the default. */
  effectiveRoleTargets: CompositionRoleTargets;
  roleSource: 'history' | 'default';
}

export interface CompositionContextUpgradeItem {
  itemId: number;
  name: string;
  slot: string | null;
  itemLevel: number | null;
  dpsGain: number | null;
  gainPercent: number | null;
  isBiS: boolean;
  isWishlist: boolean;
  isUpgrade: boolean;
  hasSimData: boolean;
}

export interface CompositionContextPerBossStats {
  bestGain: number;
  expectedGain: number;
  bisCount: number;
  upgradesCount: number;
  highlightedCount: number;
  /** Per-item breakdown — only items that are an upgrade or BiS pick. */
  items: CompositionContextUpgradeItem[];
}

export interface CompositionContextPlayer {
  characterId: number;
  name: string;
  userId: string | null;
  class: string;
  spec: string | null;
  /** Sans spécialisation : placé avec le rôle de son inscription (SIMS-209). */
  missingSpecialization?: boolean;
  granularRole: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  /** All roles this player can fill (primary + class capabilities + history). */
  playableRoles: ('TANK' | 'HEALER' | 'MELEE' | 'RANGED')[];
  buffsBrought: string[];
  perBoss: Record<string, CompositionContextPerBossStats>;
  historyByBoss: Record<string, number>;
  historyTotal: number;
}

export interface CompositionContextHistoryMember {
  characterId: number;
  name: string | null;
  class: string;
  spec: string | null;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
}

export interface CompositionContextHistoryBossEntry {
  TANK: number;
  HEALER: number;
  MELEE: number;
  RANGED: number;
  classes: Record<string, number>;
  members: CompositionContextHistoryMember[];
}

export interface CompositionContextHistoryEvent {
  id: number;
  title: string;
  startTime: string;
  perBoss: Record<string, CompositionContextHistoryBossEntry>;
}

export interface CompositionContext {
  schemaVersion: 1;
  generatedAt: string;
  event: {
    id: number;
    title: string;
    startTime: string;
    raidDifficultyId: number | null;
    realmId: number;
    difficulty: string;
    raid: { id: number; name: string; extension: string | null; season: string | null };
  };
  constraints: {
    sizeHardCap: number | null;
    flexCapMax: number;
    referenceCap: number;
    defaultRoleTargets: CompositionRoleTargets;
    activeBuffs: CompositionContextBuff[];
    allBuffs: CompositionContextBuff[];
  };
  bosses: CompositionContextBoss[];
  pool: CompositionContextPlayer[];
  unplaced?: CompositionUnplaced[];
  history: {
    weeksRequested: number;
    eventsFound: number;
    events: CompositionContextHistoryEvent[];
  };
}

export interface PastRosterEvent {
  id: number;
  title: string;
  startTime: string;
  roster: {
    tanks: PastRosterCharacter[];
    healers: PastRosterCharacter[];
    melee: PastRosterCharacter[];
    ranged: PastRosterCharacter[];
    counts: {
      tanks: number;
      healers: number;
      melee: number;
      ranged: number;
      total: number;
    };
  };
}

/** Remplaçant proposé pour une place vacante (SIMS-142). */
export interface RosterReplacement {
  characterId: number;
  name: string;
  class: string;
  spec: string | null;
  /** true si le remplaçant n'a pas de spécialisation définie (SIMS-209). */
  missingSpecialization?: boolean;
  /** false si le remplaçant tiendrait la place en off-spec. */
  isPrimaryRole: boolean;
  /** Buffs perdus que ce remplaçant rendrait au raid. */
  coveredBuffs: string[];
  bisCount: number;
  bestGain: number;
}

/** Place libérée sur un boss par un titulaire passé en absent. */
export interface RosterVacancy {
  bossId: number;
  characterId: number;
  characterName: string;
  class: string | null;
  spec: string | null;
  role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
  lostBuffs: string[];
  replacements: RosterReplacement[];
}

class RosterService {
  async getRoster(
    eventId: number,
    realmId: number,
    bossId?: number | null,
  ): Promise<EventRosterResponse> {
    const params = new URLSearchParams({ realmId: String(realmId) });
    if (bossId != null) {
      params.append('bossId', String(bossId));
    }
    const { data } = await apiClient.get(`/1/events/${eventId}/roster-assignments?${params}`);
    return data.roster;
  }

  /**
   * Get available pool (signed up but not assigned to roster)
   */
  async getPool(
    eventId: number,
    realmId: number,
    bossId?: number | null,
  ): Promise<PoolCharacter[]> {
    const params = new URLSearchParams({ realmId: String(realmId) });
    if (bossId != null) {
      params.append('bossId', String(bossId));
    }
    const { data } = await apiClient.get(`/1/events/${eventId}/roster-pool?${params}`);
    return data.pool;
  }

  async assign(
    eventId: number,
    realmId: number,
    payload: AssignToRosterPayload,
  ): Promise<RosterAssignment> {
    const { data } = await apiClient.post(
      `/1/events/${eventId}/roster-assignments?realmId=${realmId}`,
      payload,
    );
    return data.assignment;
  }

  async remove(
    eventId: number,
    characterId: number,
    realmId: number,
    bossId?: number | null,
  ): Promise<void> {
    const params = new URLSearchParams({ realmId: String(realmId) });
    if (bossId != null) {
      params.append('bossId', String(bossId));
    }
    await apiClient.delete(`/1/events/${eventId}/roster-assignments/${characterId}?${params}`);
  }

  async reorderRoster(
    eventId: number,
    realmId: number,
    bossId: number,
    role: string,
    characterIds: number[],
  ) {
    const { data } = await apiClient.put(`/1/events/${eventId}/roster-reorder?realmId=${realmId}`, {
      bossId,
      role,
      characterIds,
    });
    return data;
  }

  async copyRoster(
    eventId: number,
    realmId: number,
    sourceBossId: number,
    targetBossIds: number[],
  ) {
    const { data } = await apiClient.post(`/1/events/${eventId}/roster-copy?realmId=${realmId}`, {
      sourceBossId,
      targetBossIds,
    });
    return data;
  }

  async clearBossRoster(eventId: number, realmId: number, bossId: number) {
    const { data } = await apiClient.delete(
      `/1/events/${eventId}/roster-boss/${bossId}?realmId=${realmId}`,
    );
    return data;
  }

  async getPastRosters(eventId: number, realmId: number): Promise<PastRosterEvent[]> {
    const { data } = await apiClient.get(`/1/events/${eventId}/past-rosters?realmId=${realmId}`);
    return data.pastRosters;
  }

  /**
   * Fetch the comprehensive composition context (everything the algorithm or
   * an LLM needs to produce a proposal).
   */
  async getCompositionContext(
    eventId: number,
    realmId: number,
    historyWeeks?: number,
  ): Promise<CompositionContext> {
    const params = new URLSearchParams({ realmId: String(realmId) });
    if (historyWeeks != null) params.append('historyWeeks', String(historyWeeks));
    const { data } = await apiClient.get(`/1/events/${eventId}/composition-context?${params}`);
    return data;
  }

  /**
   * Generate an automatic composition proposal for an event.
   * Server returns a per-boss proposal — does not persist; caller must apply
   * via the standard roster-assignments endpoints.
   */
  async generateComposition(
    eventId: number,
    realmId: number,
    payload: GenerateCompositionPayload,
  ): Promise<CompositionResult> {
    const { data } = await apiClient.post(
      `/1/events/${eventId}/generate-composition?realmId=${realmId}`,
      payload,
    );
    return data;
  }

  /**
   * Places libérées par un désistement, avec 3 remplaçants classés chacune
   */
  async getReplacements(eventId: number, realmId: number): Promise<RosterVacancy[]> {
    const { data } = await apiClient.get(
      `/1/events/${eventId}/roster-replacements?realmId=${realmId}`,
    );
    return data.vacancies;
  }

  async importRosterFromEvent(
    targetEventId: number,
    realmId: number,
    sourceEventId: number,
  ): Promise<{ imported: number; skipped: number }> {
    const { data } = await apiClient.post(
      `/1/events/${targetEventId}/roster-import?realmId=${realmId}`,
      { sourceEventId },
    );
    return data;
  }
}

export const rosterService = new RosterService();
