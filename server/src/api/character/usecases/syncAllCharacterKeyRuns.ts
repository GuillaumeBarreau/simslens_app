/**
 * Accumulates completed Mythic+ runs (timed and depleted) in
 * `character_key_runs`. Raider.IO's `mythic_plus_recent_runs` caps at ~10
 * entries, so we run hourly and combine with `mythic_plus_weekly_highest_level_runs`
 * (one best-per-dungeon snapshot for the current week) to catch any runs that
 * already fell off the recent list.
 */

import { getCharacterRunsBundle } from '../../../integrations/raiderio/api';
import { getWowWeekStart, getWowWeekStartFor } from '../../../shared/utils/wowWeek';
import characterRepository from '../character.repository';

const MIN_KEY_LEVEL = 10;
const CONCURRENCY = 3;

/** Run tel que renvoyé par Raider.IO (champs utilisés). */
export interface RaiderIoRun {
  dungeon?: string;
  short_name?: string;
  mythic_level: number;
  completed_at?: string;
  score?: number;
  num_keystone_upgrades?: number;
  clear_time_ms?: number;
  par_time_ms?: number;
  url?: string;
}

export interface KeyRun {
  dungeon: string;
  shortName: string | null;
  keystoneLevel: number;
  completedAt: Date;
  score: number | null;
  numUpgrades: number;
  clearTimeMs: number | null;
  parTimeMs: number | null;
  raiderIoUrl: string | null;
}

interface SyncedCharacter {
  id: number;
  name: string;
  realm: string;
  region?: string | null;
}

interface SyncResults {
  synced: number;
  failed: number;
}

export async function syncAllCharacterKeyRuns(): Promise<SyncResults> {
  const characters: SyncedCharacter[] = await characterRepository.listCharacters();
  if (characters.length === 0) return { synced: 0, failed: 0 };

  console.log(`[KeySync] Starting sync for ${characters.length} characters`);

  const results: SyncResults = { synced: 0, failed: 0 };
  const queue = characters.slice();

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }).map(() =>
    worker(queue, results),
  );
  await Promise.all(workers);

  console.log(`[KeySync] Done — synced: ${results.synced}, failed: ${results.failed}`);
  return results;
}

async function worker(queue: SyncedCharacter[], results: SyncResults): Promise<void> {
  while (queue.length > 0) {
    const character = queue.shift();
    if (!character) continue;

    try {
      await syncCharacterKeyRuns(character);
      results.synced += 1;
    } catch (err) {
      results.failed += 1;
      console.error(
        `[KeySync] Failed for ${character.name} (${character.realm}):`,
        (err as Error).message,
      );
    }
  }
}

/**
 * Map a Raider.IO run payload to our DB shape, or return null if the
 * completed_at is missing/invalid/outside the current week window.
 */
export function normalizeRun(
  run: RaiderIoRun | null | undefined,
  weekStart: Date,
  weekEnd: Date,
  now: Date,
): KeyRun | null {
  if (!run || !run.completed_at) return null;
  const completedAt = new Date(run.completed_at);
  if (Number.isNaN(completedAt.getTime())) return null;
  if (completedAt > now) return null;
  if (completedAt < weekStart || completedAt >= weekEnd) return null;

  return {
    dungeon: run.dungeon || run.short_name || 'Unknown',
    shortName: run.short_name || null,
    keystoneLevel: run.mythic_level,
    completedAt,
    score: run.score ?? null,
    numUpgrades: run.num_keystone_upgrades ?? 0,
    clearTimeMs: run.clear_time_ms ?? null,
    parTimeMs: run.par_time_ms ?? null,
    raiderIoUrl: run.url || null,
  };
}

async function syncCharacterKeyRuns(character: SyncedCharacter): Promise<void> {
  const region = (character.region || 'eu').toLowerCase();
  const weekStart = getWowWeekStart();
  const nextWeek = new Date(weekStart.getTime() + 7 * 86400000 + 3 * 3600000);
  const weekEnd = getWowWeekStartFor(nextWeek);
  const now = new Date();

  const { recent, weeklyBest }: { recent: RaiderIoRun[]; weeklyBest: RaiderIoRun[] } =
    await getCharacterRunsBundle(region, character.realm, character.name);

  const merged = new Map<string, KeyRun>();
  const ingest = (raw: RaiderIoRun) => {
    const normalized = normalizeRun(raw, weekStart, weekEnd, now);
    if (!normalized) return;
    const key = `${normalized.dungeon}|${normalized.completedAt.toISOString()}`;
    if (!merged.has(key)) merged.set(key, normalized);
  };
  recent.forEach(ingest);
  weeklyBest.forEach(ingest);

  const runs = [...merged.values()];

  if (runs.length > 0) {
    const inserted = await characterRepository.upsertKeyRuns(character.id, runs);
    if (inserted > 0) {
      console.log(
        `[KeySync] ${character.name}: ${inserted} new run(s) (recent=${recent.length}, weeklyBest=${weeklyBest.length})`,
      );
    }
  }

  const total = await characterRepository.countWeeklyKeyRuns(
    character.id,
    weekStart,
    MIN_KEY_LEVEL,
  );
  await characterRepository.updateCharacterById(character.id, { currentPeriodKeyCount: total });
}
