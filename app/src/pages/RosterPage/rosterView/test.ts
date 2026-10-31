import type { Character } from 'types/character.types';

import { initialState, reducer } from '../RosterPage.reducers';
import {
  completenessIssues,
  countCompleteness,
  filterRoster,
  hasActiveFilters,
  isOtherRealm,
  roleOf,
  type RosterFilterState,
  sortRoster,
  splitRoster,
  summarizeComposition,
} from '.';

const char = (id: number, name: string, overrides: Partial<Character> = {}): Character =>
  ({
    id,
    name,
    class: 'mage',
    realm: 'hyjal',
    status: 'approved',
    lastModified: 0,
    userId: 'u1',
    hasDiscord: true,
    isGuest: false,
    specialization: { id: 1, name: 'Frost', classId: 8, role: 'ranged' },
    ...overrides,
  }) as Character;

const spec = (role: string) => ({ id: 1, name: 'Spec', classId: 1, role });

const baseFilters: RosterFilterState = {
  status: 'all',
  search: '',
  classFilter: 'all',
  role: 'all',
  completeness: 'all',
};

describe('roleOf', () => {
  it('lit le rôle de la spé, sans tenir compte de la casse', () => {
    expect(roleOf(char(1, 'A', { specialization: spec('TANK') }))).toBe('tank');
    expect(roleOf(char(1, 'A', { specialization: spec('melee') }))).toBe('melee');
  });

  it('classe à part un personnage sans spé ou au rôle inconnu', () => {
    expect(roleOf(char(1, 'A', { specialization: undefined }))).toBe('unknown');
    expect(roleOf(char(1, 'A', { specialization: spec('dps') }))).toBe('unknown');
  });
});

describe('summarizeComposition', () => {
  it('compte les rôles et les classes, classes triées par effectif', () => {
    const summary = summarizeComposition([
      char(1, 'A', { class: 'warrior', specialization: spec('tank') }),
      char(2, 'B', { class: 'priest', specialization: spec('healer') }),
      char(3, 'C', { class: 'warrior', specialization: spec('melee') }),
      char(4, 'D', { class: 'mage' }),
      char(5, 'E', { class: 'mage', specialization: undefined }),
    ]);
    expect(summary.total).toBe(5);
    expect(summary.roles).toEqual({ tank: 1, healer: 1, melee: 1, ranged: 1, unknown: 1 });
    expect(summary.classes).toEqual([
      { name: 'mage', count: 2 },
      { name: 'warrior', count: 2 },
      { name: 'priest', count: 1 },
    ]);
  });
});

describe('complétude', () => {
  it('signale Discord absent, compte non lié et wishlist vide', () => {
    const c = char(1, 'A', { hasDiscord: false, userId: null });
    expect(completenessIssues(c, {})).toEqual(['no_discord', 'not_linked', 'empty_wishlist']);
    expect(completenessIssues(char(2, 'B'), { 2: 3 })).toEqual([]);
  });

  it('compte chaque manque et les personnages incomplets une seule fois', () => {
    const counts = countCompleteness(
      [char(1, 'A', { hasDiscord: false, userId: null }), char(2, 'B'), char(3, 'C')],
      { 2: 10, 3: 0 },
    );
    expect(counts).toEqual({ no_discord: 1, not_linked: 1, empty_wishlist: 2, incomplete: 2 });
  });
});

describe('isOtherRealm', () => {
  it('ignore la casse, les accents et la ponctuation', () => {
    expect(isOtherRealm("Kael'thas", 'kaelthas')).toBe(false);
    expect(isOtherRealm('Conseil des Ombres', 'conseil-des-ombres')).toBe(false);
    expect(isOtherRealm('Élune', 'elune')).toBe(false);
    expect(isOtherRealm('Archimonde', 'Hyjal')).toBe(true);
  });

  it("n'affiche rien sans royaume de référence", () => {
    expect(isOtherRealm('Archimonde', undefined)).toBe(false);
  });
});

describe('splitRoster', () => {
  it('sépare membres, en attente et invités (actifs et en attente)', () => {
    const lists = splitRoster(
      [char(1, 'A'), char(2, 'G', { isGuest: true })],
      [char(3, 'P', { status: 'pending' }), char(4, 'GP', { status: 'pending', isGuest: true })],
    );
    expect(lists.active.map((c) => c.id)).toEqual([1]);
    expect(lists.pending.map((c) => c.id)).toEqual([3]);
    expect(lists.guests.map((c) => c.id)).toEqual([2, 4]);
  });
});

describe('filterRoster', () => {
  const lists = splitRoster(
    [
      char(1, 'Azure', { class: 'mage' }),
      char(2, 'Blackrock', { class: 'paladin', specialization: spec('tank'), hasDiscord: false }),
      char(3, 'Borean', { class: 'druid', specialization: spec('healer'), userId: null }),
    ],
    [char(4, 'Pending', { status: 'pending' })],
  );
  const completion = { 1: 12, 2: 5 };

  it('cherche par nom, sans tenir compte de la casse', () => {
    const result = filterRoster(lists, { ...baseFilters, search: ' bo ' }, completion);
    expect(result.map((c) => c.id)).toEqual([3]);
  });

  it('filtre par classe et par rôle', () => {
    expect(
      filterRoster(lists, { ...baseFilters, classFilter: 'Paladin' }, completion).map((c) => c.id),
    ).toEqual([2]);
    expect(
      filterRoster(lists, { ...baseFilters, role: 'healer' }, completion).map((c) => c.id),
    ).toEqual([3]);
  });

  it('filtre par manque précis ou par « à compléter »', () => {
    const ids = (completeness: RosterFilterState['completeness']) =>
      filterRoster(lists, { ...baseFilters, completeness }, completion).map((c) => c.id);
    expect(ids('no_discord')).toEqual([2]);
    expect(ids('not_linked')).toEqual([3]);
    expect(ids('empty_wishlist')).toEqual([3]);
    expect(ids('incomplete')).toEqual([2, 3]);
  });

  it('part de la liste du statut choisi', () => {
    const result = filterRoster(lists, { ...baseFilters, status: 'pending' }, completion);
    expect(result.map((c) => c.id)).toEqual([4]);
  });

  it('repère les filtres actifs, hors statut', () => {
    expect(hasActiveFilters(baseFilters)).toBe(false);
    expect(hasActiveFilters({ ...baseFilters, search: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...baseFilters, role: 'tank' })).toBe(true);
  });
});

describe('sortRoster', () => {
  const roster = [char(1, 'Charlie'), char(2, 'alpha'), char(3, 'Bravo')];

  it('trie par nom', () => {
    expect(sortRoster(roster, 'name', 'asc', {}).map((c) => c.id)).toEqual([2, 3, 1]);
    expect(sortRoster(roster, 'name', 'desc', {}).map((c) => c.id)).toEqual([1, 3, 2]);
  });

  it('trie par wishlist, puis par nom à égalité', () => {
    const result = sortRoster(roster, 'wishlist', 'desc', { 1: 5, 3: 5 });
    expect(result.map((c) => c.id)).toEqual([3, 1, 2]);
  });

  it('ne modifie pas la liste reçue', () => {
    sortRoster(roster, 'name', 'asc', {});
    expect(roster.map((c) => c.id)).toEqual([1, 2, 3]);
  });
});

describe('reducer', () => {
  it('inverse le sens au second clic, et trie la wishlist d’abord par les plus remplies', () => {
    const byWishlist = reducer(initialState, { type: 'SORT_BY', payload: 'wishlist' });
    expect(byWishlist).toMatchObject({ sortKey: 'wishlist', sortDir: 'desc' });
    expect(reducer(byWishlist, { type: 'SORT_BY', payload: 'wishlist' }).sortDir).toBe('asc');
  });

  it('réinitialise les filtres sans toucher au statut', () => {
    const filtered = [
      { type: 'SET_STATUS_FILTER', payload: 'pending' },
      { type: 'SET_SEARCH_QUERY', payload: 'x' },
      { type: 'SET_ROLE_FILTER', payload: 'tank' },
      { type: 'SET_COMPLETENESS_FILTER', payload: 'no_discord' },
      { type: 'SET_CLASS_FILTER', payload: 'mage' },
    ].reduce((s, a) => reducer(s, a as Parameters<typeof reducer>[1]), initialState);
    const reset = reducer(filtered, { type: 'RESET_FILTERS' });
    expect(reset).toMatchObject({
      statusFilter: 'pending',
      searchQuery: '',
      roleFilter: 'all',
      completenessFilter: 'all',
      classFilter: 'all',
    });
  });
});
