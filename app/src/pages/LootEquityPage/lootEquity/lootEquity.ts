import type { LootEquityPlayer, RaidRole } from 'services/attendance.service';

export type RoleFilter = 'ALL' | RaidRole;

export type EquitySortKey =
  | 'name'
  | 'itemsReceived'
  | 'itemsPerRaid'
  | 'averageGainPercent'
  | 'cumulativeGainPercent'
  | 'bisFillRate'
  | 'presenceRate';

export type SortDir = 'asc' | 'desc';

export const RAID_ROLES: RaidRole[] = ['TANK', 'HEALER', 'MELEE', 'RANGED'];

/** Objets reçus par soirée où le joueur était présent ; `null` sans présence. */
export function itemsPerRaid(player: LootEquityPlayer): number | null {
  return player.present > 0 ? player.itemsReceived / player.present : null;
}

function sortValue(player: LootEquityPlayer, key: EquitySortKey): string | number | null {
  if (key === 'itemsPerRaid') return itemsPerRaid(player);
  return player[key];
}

/**
 * Filtre par rôle puis trie. Une valeur inconnue (gain sans sim, joueur sans
 * soirée attendue) reste en fin de liste dans les deux sens de tri.
 */
export function filterAndSortPlayers(
  players: LootEquityPlayer[],
  role: RoleFilter,
  key: EquitySortKey,
  dir: SortDir,
): LootEquityPlayer[] {
  const factor = dir === 'asc' ? 1 : -1;
  return players
    .filter((p) => role === 'ALL' || p.role === role)
    .sort((a, b) => {
      const va = sortValue(a, key);
      const vb = sortValue(b, key);
      if (va === null && vb === null) return a.name.localeCompare(b.name);
      if (va === null) return 1;
      if (vb === null) return -1;
      const diff =
        typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
      return diff !== 0 ? diff * factor : a.name.localeCompare(b.name);
    });
}

export function formatPercent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export function formatGain(gain: number | null): string {
  if (gain === null) return '—';
  const sign = gain > 0 ? '+' : '';
  return `${sign}${gain.toFixed(2)}%`;
}

/**
 * Date et heure d'un drop. Le serveur lit l'heure du client de jeu comme de
 * l'UTC (l'addon n'a pas de fuseau) : l'afficher en UTC rend l'heure saisie
 * en jeu, sans décalage du navigateur.
 */
export function formatDropDate(iso: string, locale?: string): string {
  return new Date(iso).toLocaleString(locale, {
    timeZone: 'UTC',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/**
 * Jour calendaire local au format `AAAA-MM-JJ`. `toISOString()` passerait
 * par l'UTC et décalerait la borne d'un jour selon le fuseau et l'heure.
 */
export function toLocalIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
