import type { CharacterEnchantChecks, EnchantCheck } from 'services/tracking.service';
import { freshnessFromAge, reportAgeDays } from 'utils/droptimizer';

export const SIM_MODES = ['normal', 'heroic', 'mythic'] as const;
export type SimMode = (typeof SIM_MODES)[number];
export type TrackingView = 'overview' | SimMode;

export type SimState = 'fresh' | 'late' | 'stale' | 'missing' | 'done';
export const SIM_STATES: readonly SimState[] = ['fresh', 'late', 'stale', 'missing', 'done'];

export type GearAnomalyLevel = 'none' | 'orange' | 'red';
export type AnomalyFilter = 'all' | GearAnomalyLevel;

export interface ModeReport {
  id: string;
  timestamp: number;
  hasNoUpgrade?: boolean;
}

export interface TrackedCharacter {
  id: number;
  name: string;
  reportsByDifficulty?: Partial<Record<SimMode, ModeReport | null>> | null;
}

export const SIM_STATE_COLOR: Record<SimState, string> = {
  fresh: 'teal',
  late: 'orange',
  stale: 'red',
  missing: 'gray',
  done: 'gray',
};

export function isTrackingView(value: unknown): value is TrackingView {
  return value === 'overview' || (SIM_MODES as readonly unknown[]).includes(value);
}

export function modeReport(character: TrackedCharacter, mode: SimMode): ModeReport | null {
  return character.reportsByDifficulty?.[mode] ?? null;
}

export function simStateOf(
  report: ModeReport | null | undefined,
  staleAfterDays: number,
  now: number = Date.now(),
): SimState {
  if (!report) return 'missing';
  if (report.hasNoUpgrade) return 'done';
  return freshnessFromAge(reportAgeDays(report.timestamp, now), staleAfterDays);
}

export function needsAction(state: SimState): boolean {
  return state === 'late' || state === 'stale' || state === 'missing';
}

export function reportAgeInDays(report: ModeReport, now: number = Date.now()): number {
  return Math.max(0, Math.floor(reportAgeDays(report.timestamp, now)));
}

export type ModeSummary = Record<SimState, number> & { total: number };

export function summarizeMode(
  characters: TrackedCharacter[],
  mode: SimMode,
  staleAfterDays: number,
  now: number = Date.now(),
): ModeSummary {
  const summary: ModeSummary = { fresh: 0, late: 0, stale: 0, missing: 0, done: 0, total: 0 };
  for (const c of characters) {
    summary[simStateOf(modeReport(c, mode), staleAfterDays, now)]++;
    summary.total++;
  }
  return summary;
}

const STATE_RANK: Record<SimState, number> = { missing: 0, stale: 1, late: 2, fresh: 3, done: 4 };

export function stateSortValue(
  character: TrackedCharacter,
  view: TrackingView,
  staleAfterDays: number,
  now: number = Date.now(),
): number {
  const modes = view === 'overview' ? SIM_MODES : [view];
  return Math.min(
    ...modes.map(
      (mode) => STATE_RANK[simStateOf(modeReport(character, mode), staleAfterDays, now)],
    ),
  );
}

export interface TrackingFilters {
  view: TrackingView;
  state: SimState | null;
  todoOnly: boolean;
  search: string;
  anomaly: AnomalyFilter;
}

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filterRoster<T extends TrackedCharacter>(
  characters: T[],
  filters: TrackingFilters,
  staleAfterDays: number,
  anomalyByCharacter: Record<number, GearAnomalyLevel | null> = {},
  now: number = Date.now(),
): T[] {
  const query = normalize(filters.search);
  const modes = filters.view === 'overview' ? SIM_MODES : [filters.view];

  return characters.filter((c) => {
    if (query && !normalize(c.name).includes(query)) return false;
    if (filters.anomaly !== 'all' && (anomalyByCharacter[c.id] ?? null) !== filters.anomaly) {
      return false;
    }
    const states = modes.map((mode) => simStateOf(modeReport(c, mode), staleAfterDays, now));
    if (filters.view !== 'overview' && filters.state && states[0] !== filters.state) return false;
    if (filters.todoOnly && !states.some(needsAction)) return false;
    return true;
  });
}

export function countAnomalies(
  characters: TrackedCharacter[],
  anomalyByCharacter: Record<number, GearAnomalyLevel | null>,
): Record<GearAnomalyLevel, number> {
  const counts: Record<GearAnomalyLevel, number> = { none: 0, orange: 0, red: 0 };
  for (const c of characters) {
    const level = anomalyByCharacter[c.id];
    if (level) counts[level]++;
  }
  return counts;
}

export function gearAnomalyLevel(
  checks: CharacterEnchantChecks | null | undefined,
): GearAnomalyLevel | null {
  if (!checks) return null;
  const broken = (r: EnchantCheck) => r.reason === 'missing' || r.reason === 'invalid';
  if (checks.results.some(broken) || checks.gems.some(broken) || !checks.hasEpicGem) {
    return 'red';
  }
  const inferior =
    checks.results.some((r) => r.isValid && r.craftingQuality === 1) ||
    checks.gems.some((r) => r.isValid && r.rank === 1);
  return inferior ? 'orange' : 'none';
}

const VIEW_STORAGE_KEY = 'tracking:view';

export function readStoredView(): TrackingView {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return isTrackingView(stored) ? stored : 'overview';
  } catch {
    return 'overview';
  }
}

export function storeView(view: TrackingView): void {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Stockage indisponible (navigation privée, données bloquées) : choix non mémorisé.
  }
}
