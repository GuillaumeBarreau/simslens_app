import type { Character } from 'types/character.types';

export const ROLES = ['tank', 'healer', 'melee', 'ranged'] as const;
export type Role = (typeof ROLES)[number];
export type RoleOrUnknown = Role | 'unknown';

export type StatusFilter = 'all' | 'pending' | 'guests';
export type RoleFilter = 'all' | RoleOrUnknown;

export const COMPLETENESS_ISSUES = ['no_discord', 'not_linked', 'empty_wishlist'] as const;
export type CompletenessIssue = (typeof COMPLETENESS_ISSUES)[number];
export type CompletenessFilter = 'all' | 'incomplete' | CompletenessIssue;

export const WISHLIST_TOTAL_SLOTS = 15;
export const WISHLIST_DONE_THRESHOLD = Math.ceil(WISHLIST_TOTAL_SLOTS * 0.8);

export type WishlistCompletion = Record<number, number>;

export function roleOf(character: Pick<Character, 'specialization'>): RoleOrUnknown {
  const role = character.specialization?.role?.toLowerCase();
  return (ROLES as readonly string[]).includes(role ?? '') ? (role as Role) : 'unknown';
}

export interface Composition {
  total: number;
  roles: Record<RoleOrUnknown, number>;
  classes: { name: string; count: number }[];
}

export function summarizeComposition(characters: Character[]): Composition {
  const roles: Record<RoleOrUnknown, number> = {
    tank: 0,
    healer: 0,
    melee: 0,
    ranged: 0,
    unknown: 0,
  };
  const classCounts = new Map<string, number>();
  for (const c of characters) {
    roles[roleOf(c)] += 1;
    const name = String(c.class || '').toLowerCase();
    if (name) classCounts.set(name, (classCounts.get(name) ?? 0) + 1);
  }
  const classes = [...classCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { total: characters.length, roles, classes };
}

export function wishlistCount(character: Pick<Character, 'id'>, completion: WishlistCompletion) {
  return completion[character.id] ?? 0;
}

export function completenessIssues(
  character: Pick<Character, 'id' | 'hasDiscord' | 'userId'>,
  completion: WishlistCompletion,
): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  if (!character.hasDiscord) issues.push('no_discord');
  if (!character.userId) issues.push('not_linked');
  if (wishlistCount(character, completion) === 0) issues.push('empty_wishlist');
  return issues;
}

export function countCompleteness(
  characters: Character[],
  completion: WishlistCompletion,
): Record<CompletenessIssue | 'incomplete', number> {
  const counts = { no_discord: 0, not_linked: 0, empty_wishlist: 0, incomplete: 0 };
  for (const c of characters) {
    const issues = completenessIssues(c, completion);
    for (const issue of issues) counts[issue] += 1;
    if (issues.length > 0) counts.incomplete += 1;
  }
  return counts;
}

export function normalizeRealm(realm: string | null | undefined): string {
  return (realm ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function isOtherRealm(characterRealm: string | null | undefined, guildRealm?: string) {
  if (!characterRealm || !guildRealm) return false;
  return normalizeRealm(characterRealm) !== normalizeRealm(guildRealm);
}

export interface RosterLists {
  active: Character[];
  pending: Character[];
  guests: Character[];
}

export function splitRoster(active: Character[], pending: Character[]): RosterLists {
  return {
    active: active.filter((c) => !c.isGuest),
    pending: pending.filter((c) => !c.isGuest),
    guests: [...active, ...pending].filter((c) => c.isGuest),
  };
}

export interface RosterFilterState {
  status: StatusFilter;
  search: string;
  classFilter: string;
  role: RoleFilter;
  completeness: CompletenessFilter;
}

export function hasActiveFilters(f: Omit<RosterFilterState, 'status'>): boolean {
  return (
    f.search.trim() !== '' ||
    f.classFilter !== 'all' ||
    f.role !== 'all' ||
    f.completeness !== 'all'
  );
}

export function listForStatus(lists: RosterLists, status: StatusFilter): Character[] {
  if (status === 'pending') return lists.pending;
  if (status === 'guests') return lists.guests;
  return lists.active;
}

export function filterRoster(
  lists: RosterLists,
  filters: RosterFilterState,
  completion: WishlistCompletion,
): Character[] {
  const search = filters.search.trim().toLowerCase();
  return listForStatus(lists, filters.status).filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (
      filters.classFilter !== 'all' &&
      String(c.class).toLowerCase() !== filters.classFilter.toLowerCase()
    ) {
      return false;
    }
    if (filters.role !== 'all' && roleOf(c) !== filters.role) return false;
    if (filters.completeness !== 'all') {
      const issues = completenessIssues(c, completion);
      if (filters.completeness === 'incomplete') return issues.length > 0;
      return issues.includes(filters.completeness);
    }
    return true;
  });
}

export type RosterSortKey = 'name' | 'role' | 'wishlist';

const ROLE_ORDER: Record<RoleOrUnknown, number> = {
  tank: 0,
  healer: 1,
  melee: 2,
  ranged: 3,
  unknown: 4,
};

export function sortRoster(
  characters: Character[],
  key: RosterSortKey,
  dir: 'asc' | 'desc',
  completion: WishlistCompletion,
): Character[] {
  const sign = dir === 'asc' ? 1 : -1;
  const byName = (a: Character, b: Character) => a.name.localeCompare(b.name);
  return [...characters].sort((a, b) => {
    let diff = 0;
    if (key === 'role') diff = ROLE_ORDER[roleOf(a)] - ROLE_ORDER[roleOf(b)];
    else if (key === 'wishlist') diff = wishlistCount(a, completion) - wishlistCount(b, completion);
    else diff = byName(a, b);
    return diff !== 0 ? diff * sign : byName(a, b);
  });
}
