import type { Character } from 'types/character.types';
import type { UpgradeBatchRow, UpgradesByItem } from 'types/upgrade.types';
import { normalizeClass } from 'utils';
import { simulatedSpecName } from 'utils/simulatedSpecialization';

import type { RoleFilter } from '../LootsOptimiserPage.reducers';

export const ROLE_FILTERS: readonly RoleFilter[] = ['all', 'dps', 'heals', 'tanks'];

export type DroptimizerView = 'standard' | 'wishlist';

export type EmptyReason =
  'no_loot' | 'no_match' | 'no_sims' | 'no_wishes' | 'boss_empty' | 'role_filtered';

interface ItemLike {
  id: number | string;
}

export function matchesRoleFilter(role: string | null | undefined, filter: RoleFilter): boolean {
  if (filter === 'all' || !role) return true;
  const value = role.toLowerCase();
  if (filter === 'dps') return value === 'dps' || value === 'melee' || value === 'ranged';
  if (filter === 'heals') return value === 'healer';
  return value === 'tank';
}

export function rowRole(row: Pick<UpgradeBatchRow, 'simSpecialization' | 'specialization'>) {
  return row.simSpecialization?.role ?? row.specialization?.role ?? null;
}

export function gainPercent(row: Pick<UpgradeBatchRow, 'dps' | 'baseDps'>): number | null {
  const { dps, baseDps } = row;
  if (dps == null || baseDps == null || baseDps <= 0) return null;
  return ((dps - baseDps) / baseDps) * 100;
}

export function gainSign(gain: number | null): 'positive' | 'negative' | 'zero' | 'unknown' {
  if (gain === null) return 'unknown';
  const rounded = Math.round(gain * 10) / 10;
  if (rounded > 0) return 'positive';
  return rounded < 0 ? 'negative' : 'zero';
}

export function formatGain(gain: number | null): string {
  if (gain === null) return '?';
  const rounded = Math.round(gain * 10) / 10;
  if (rounded === 0) return '0.0 %';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)} %`;
}

export function ownsItem(
  row: Pick<UpgradeBatchRow, 'equippedItems'>,
  itemId: number,
  itemLevel: number,
): boolean {
  return Boolean(row.equippedItems?.some((eq) => eq.itemId === itemId && eq.ilevel >= itemLevel));
}

const byGainDesc = (a: { gain: number | null }, b: { gain: number | null }) =>
  (b.gain ?? -Infinity) - (a.gain ?? -Infinity);

export interface PlayerGain {
  row: UpgradeBatchRow;
  gain: number | null;
}

function characterKey(row: Pick<UpgradeBatchRow, 'characterId' | 'name'>): string {
  return row.characterId != null ? `id:${row.characterId}` : `name:${row.name}`;
}

export function groupByCharacter(rows: UpgradeBatchRow[]): UpgradeBatchRow[][] {
  const groups = new Map<string, UpgradeBatchRow[]>();
  for (const row of rows) {
    const key = characterKey(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()];
}

function bestGain(rows: UpgradeBatchRow[]): PlayerGain {
  return rows
    .map((row) => ({ row, gain: gainPercent(row) }))
    .reduce((best, entry) => ((entry.gain ?? -Infinity) > (best.gain ?? -Infinity) ? entry : best));
}

export interface ItemGains<I extends ItemLike> {
  item: I;
  interested: PlayerGain[];
  owned: UpgradeBatchRow[];
  rows: UpgradeBatchRow[];
}

export function summarizeGains<I extends ItemLike>(
  items: I[],
  upgradesByItem: UpgradesByItem,
  { roleFilter, itemLevel }: { roleFilter: RoleFilter; itemLevel: number },
): ItemGains<I>[] {
  return items
    .map((item) => {
      const rows = (upgradesByItem[String(item.id)] ?? []).filter((row) =>
        matchesRoleFilter(rowRole(row), roleFilter),
      );
      const interested: PlayerGain[] = [];
      const owned: UpgradeBatchRow[] = [];
      for (const group of groupByCharacter(rows)) {
        const ownedRow = group.find((row) => ownsItem(row, Number(item.id), itemLevel));
        if (ownedRow) owned.push(ownedRow);
        else interested.push(bestGain(group));
      }
      interested.sort(byGainDesc);
      return { item, interested, owned, rows: [...interested.map((p) => p.row), ...owned] };
    })
    .filter((entry) => entry.rows.length > 0)
    .sort((a, b) => {
      if (b.interested.length !== a.interested.length) {
        return b.interested.length - a.interested.length;
      }
      return (b.interested[0]?.gain ?? -Infinity) - (a.interested[0]?.gain ?? -Infinity);
    });
}

type PlayerLike = Pick<Character, 'id' | 'name'>;

function findPlayerRow(rows: UpgradeBatchRow[], player: PlayerLike) {
  const matches = rows.filter((row) => row.name === player.name || row.characterId === player.id);
  if (matches.length === 0) return undefined;
  const wished = matches.filter((row) => row.isWishlist);
  return bestGain(wished.length > 0 ? wished : matches).row;
}

export interface WishEntry<P extends PlayerLike> {
  player: P;
  row: UpgradeBatchRow;
  gain: number | null;
}

export interface ItemWishes<I extends ItemLike, P extends PlayerLike> {
  item: I;
  interested: WishEntry<P>[];
  owned: WishEntry<P>[];
}

export function summarizeWishesByItem<I extends ItemLike, P extends PlayerLike>(
  items: I[],
  upgradesByItem: UpgradesByItem,
  players: P[],
  itemLevel: number,
): ItemWishes<I, P>[] {
  return items
    .map((item) => {
      const rows = upgradesByItem[String(item.id)] ?? [];
      const interested: WishEntry<P>[] = [];
      const owned: WishEntry<P>[] = [];
      for (const player of players) {
        const row = findPlayerRow(rows, player);
        if (!row?.isWishlist) continue;
        const entry = { player, row, gain: gainPercent(row) };
        if (ownsItem(row, Number(item.id), itemLevel)) owned.push(entry);
        else interested.push(entry);
      }
      interested.sort(byGainDesc);
      return { item, interested, owned };
    })
    .filter((entry) => entry.interested.length > 0 || entry.owned.length > 0)
    .sort((a, b) => b.interested.length - a.interested.length);
}

export interface ItemWish<I extends ItemLike> {
  item: I;
  row: UpgradeBatchRow;
  gain: number | null;
}

export interface PlayerWishes<I extends ItemLike, P extends PlayerLike> {
  player: P;
  simulatedSpec: string | null;
  needed: ItemWish<I>[];
  obtained: ItemWish<I>[];
}

export function summarizeWishesByPlayer<I extends ItemLike, P extends PlayerLike>(
  items: I[],
  upgradesByItem: UpgradesByItem,
  players: P[],
  itemLevel: number,
): PlayerWishes<I, P>[] {
  return players
    .map((player) => {
      const needed: ItemWish<I>[] = [];
      const obtained: ItemWish<I>[] = [];
      let simulatedSpec: string | null = null;
      for (const item of items) {
        const row = findPlayerRow(upgradesByItem[String(item.id)] ?? [], player);
        if (!row) continue;
        simulatedSpec ??= simulatedSpecName(row);
        if (!row.isWishlist) continue;
        const entry = { item, row, gain: gainPercent(row) };
        if (ownsItem(row, Number(item.id), itemLevel)) obtained.push(entry);
        else needed.push(entry);
      }
      needed.sort(byGainDesc);
      return { player, simulatedSpec, needed, obtained };
    })
    .filter((entry) => entry.needed.length + entry.obtained.length > 0)
    .sort((a, b) => {
      if (b.needed.length !== a.needed.length) return b.needed.length - a.needed.length;
      return a.player.name.localeCompare(b.player.name);
    });
}

export function countRows(
  itemIds: Array<number | string>,
  upgradesByItem: UpgradesByItem,
  predicate: (row: UpgradeBatchRow) => boolean = () => true,
): number {
  let total = 0;
  for (const id of itemIds) {
    total += (upgradesByItem[String(id)] ?? []).filter(predicate).length;
  }
  return total;
}

export function countInterestingItems(
  itemIds: Array<number | string>,
  upgradesByItem: UpgradesByItem,
  {
    view,
    roleFilter,
    itemLevel,
    players,
  }: {
    view: DroptimizerView;
    roleFilter: RoleFilter;
    itemLevel: number;
    players?: PlayerLike[];
  },
): number {
  return itemIds.filter((id) => {
    const rows = upgradesByItem[String(id)] ?? [];
    return rows.some((row) => {
      if (ownsItem(row, Number(id), itemLevel)) return false;
      if (view === 'standard') return matchesRoleFilter(rowRole(row), roleFilter);
      if (!row.isWishlist) return false;
      return (players ?? []).some((p) => row.name === p.name || row.characterId === p.id);
    });
  }).length;
}

export function emptyReason({
  view,
  itemCount,
  searchActive,
  raidRowCount,
  scopeRowCount,
  visibleCount,
}: {
  view: DroptimizerView;
  itemCount: number;
  searchActive: boolean;
  raidRowCount: number;
  scopeRowCount: number;
  visibleCount: number;
}): EmptyReason | null {
  if (visibleCount > 0) return null;
  if (itemCount === 0) return searchActive ? 'no_match' : 'no_loot';
  if (raidRowCount === 0) return view === 'standard' ? 'no_sims' : 'no_wishes';
  if (scopeRowCount === 0) return 'boss_empty';
  return 'role_filtered';
}

export function parseBossIndex(
  param: string | undefined,
  bossCount: number,
): number | 'all' | 'invalid' {
  if (param === 'all') return 'all';
  if (param === undefined) return 0;
  const idx = Number(param);
  if (!Number.isInteger(idx) || idx < 0) return 'invalid';
  if (bossCount > 0 && idx >= bossCount) return 'invalid';
  return idx;
}

export function classColorClass(playerClass: string | number | null | undefined): string {
  return `class-${normalizeClass(playerClass ?? undefined)}`;
}
