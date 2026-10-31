import { initialState, initState, reducer } from '../TrackingPage.reducers';
import {
  countAnomalies,
  filterRoster,
  gearAnomalyLevel,
  isTrackingView,
  needsAction,
  readStoredView,
  reportAgeInDays,
  simStateOf,
  stateSortValue,
  storeView,
  summarizeMode,
  type TrackedCharacter,
  type TrackingFilters,
} from '.';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 10, 12);
const STALE = 7;

const report = (ageDays: number, hasNoUpgrade = false) => ({
  id: `r${ageDays}`,
  timestamp: NOW - ageDays * DAY,
  hasNoUpgrade,
});

const char = (
  id: number,
  name: string,
  reports: TrackedCharacter['reportsByDifficulty'],
): TrackedCharacter => ({ id, name, reportsByDifficulty: reports });

const roster = [
  char(1, 'Élune', { normal: report(1), heroic: report(5), mythic: report(10) }),
  char(2, 'Thrall', { normal: report(1), heroic: report(1), mythic: report(2, true) }),
  char(3, 'Jaina', { normal: null, heroic: report(1), mythic: null }),
  char(4, 'Arthas', null),
];

const filters = (overrides: Partial<TrackingFilters> = {}): TrackingFilters => ({
  view: 'overview',
  state: null,
  todoOnly: false,
  search: '',
  anomaly: 'all',
  ...overrides,
});

const names = (list: TrackedCharacter[]) => list.map((c) => c.name);

describe('simStateOf — état du rapport d’un mode', () => {
  it('distingue à jour, en retard, à refaire, manquant et terminé', () => {
    expect(simStateOf(report(1), STALE, NOW)).toBe('fresh');
    expect(simStateOf(report(5), STALE, NOW)).toBe('late');
    expect(simStateOf(report(7), STALE, NOW)).toBe('stale');
    expect(simStateOf(null, STALE, NOW)).toBe('missing');
    expect(simStateOf(undefined, STALE, NOW)).toBe('missing');
  });

  it('un rapport sans amélioration est terminé, quel que soit son âge', () => {
    expect(simStateOf(report(30, true), STALE, NOW)).toBe('done');
  });

  it('suit le seuil de péremption de la guilde', () => {
    expect(simStateOf(report(10), 14, NOW)).toBe('late');
    expect(simStateOf(report(2), 2, NOW)).toBe('stale');
  });

  it('seuls en retard, à refaire et manquant demandent une action', () => {
    expect(
      ['fresh', 'late', 'stale', 'missing', 'done'].map((s) => needsAction(s as never)),
    ).toEqual([false, true, true, true, false]);
  });

  it('arrondit l’âge au jour inférieur', () => {
    expect(reportAgeInDays({ id: 'x', timestamp: NOW - 2.9 * DAY }, NOW)).toBe(2);
    expect(reportAgeInDays({ id: 'x', timestamp: NOW + DAY }, NOW)).toBe(0);
  });
});

describe('summarizeMode — synthèse par mode', () => {
  it('compte chaque état sur tout le roster', () => {
    expect(summarizeMode(roster, 'mythic', STALE, NOW)).toEqual({
      fresh: 0,
      late: 0,
      stale: 1,
      missing: 2,
      done: 1,
      total: 4,
    });
    expect(summarizeMode(roster, 'heroic', STALE, NOW)).toMatchObject({
      fresh: 2,
      late: 1,
      missing: 1,
    });
  });
});

describe('filterRoster — filtres du tableau', () => {
  it('recherche par nom sans tenir compte de la casse ni des accents', () => {
    expect(names(filterRoster(roster, filters({ search: 'elu' }), STALE, {}, NOW))).toEqual([
      'Élune',
    ]);
  });

  it('filtre sur l’état exact du mode affiché', () => {
    const result = filterRoster(
      roster,
      filters({ view: 'mythic', state: 'missing' }),
      STALE,
      {},
      NOW,
    );
    expect(names(result)).toEqual(['Jaina', 'Arthas']);
  });

  it('ignore le filtre d’état en vue d’ensemble', () => {
    expect(filterRoster(roster, filters({ state: 'missing' }), STALE, {}, NOW)).toHaveLength(4);
  });

  it('« à traiter » ne garde que le mode affiché qui demande une action', () => {
    expect(
      names(filterRoster(roster, filters({ view: 'heroic', todoOnly: true }), STALE, {}, NOW)),
    ).toEqual(['Élune', 'Arthas']);
  });

  it('« à traiter » en vue d’ensemble : au moins un mode demande une action', () => {
    expect(names(filterRoster(roster, filters({ todoOnly: true }), STALE, {}, NOW))).toEqual([
      'Élune',
      'Jaina',
      'Arthas',
    ]);
  });

  it('filtre sur le niveau d’anomalie de l’équipement', () => {
    const anomalies = { 1: 'red', 2: 'none', 3: null } as const;
    expect(names(filterRoster(roster, filters({ anomaly: 'red' }), STALE, anomalies, NOW))).toEqual(
      ['Élune'],
    );
    expect(countAnomalies(roster, anomalies)).toEqual({ none: 1, orange: 0, red: 1 });
  });
});

describe('stateSortValue — tri de la colonne d’état', () => {
  it('classe du manquant au terminé, sur le mode affiché ou le pire des trois', () => {
    const [elune, thrall, jaina] = roster;
    expect(stateSortValue(thrall, 'mythic', STALE, NOW)).toBeGreaterThan(
      stateSortValue(thrall, 'normal', STALE, NOW),
    );
    expect(stateSortValue(elune, 'overview', STALE, NOW)).toBe(
      stateSortValue(elune, 'mythic', STALE, NOW),
    );
    expect(stateSortValue(jaina, 'overview', STALE, NOW)).toBe(0);
  });
});

describe('gearAnomalyLevel — anomalies d’équipement', () => {
  const ok = { slot: 'chest', isValid: true, reason: 'ok' };
  it('rouge si un enchantement manque ou sans gemme épique, orange si rang 1', () => {
    expect(gearAnomalyLevel(null)).toBeNull();
    expect(
      gearAnomalyLevel({
        results: [{ ...ok, reason: 'missing' }],
        gems: [],
        hasEpicGem: true,
      }),
    ).toBe('red');
    expect(gearAnomalyLevel({ results: [ok], gems: [], hasEpicGem: false })).toBe('red');
    expect(
      gearAnomalyLevel({
        results: [{ ...ok, craftingQuality: 1 }],
        gems: [],
        hasEpicGem: true,
      }),
    ).toBe('orange');
    expect(gearAnomalyLevel({ results: [ok], gems: [], hasEpicGem: true })).toBe('none');
  });
});

describe('mode mémorisé', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('relit le dernier mode choisi, vue d’ensemble par défaut', () => {
    expect(readStoredView()).toBe('overview');
    storeView('heroic');
    expect(readStoredView()).toBe('heroic');
    window.localStorage.setItem('tracking:view', 'nimporte');
    expect(readStoredView()).toBe('overview');
    expect(isTrackingView('mythic')).toBe(true);
  });

  it('survit à un stockage indisponible', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(() => storeView('mythic')).not.toThrow();
      expect(readStoredView()).toBe('overview');
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
    }
  });
});

describe('reducer — filtres et tri', () => {
  it('un clic sur un compteur choisit le mode et bascule le filtre d’état', () => {
    const once = reducer(initialState, {
      type: 'TOGGLE_STATE_FILTER',
      payload: { mode: 'mythic', state: 'stale' },
    });
    expect(once).toMatchObject({ view: 'mythic', stateFilter: 'stale' });
    const twice = reducer(once, {
      type: 'TOGGLE_STATE_FILTER',
      payload: { mode: 'mythic', state: 'stale' },
    });
    expect(twice.stateFilter).toBeNull();
  });

  it('changer de mode retire le filtre d’état ; réinitialiser garde le mode', () => {
    const filtered = { ...initState('heroic'), stateFilter: 'late' as const, search: 'x' };
    expect(reducer(filtered, { type: 'SET_VIEW', payload: 'normal' }).stateFilter).toBeNull();
    expect(reducer(filtered, { type: 'RESET_FILTERS' })).toMatchObject({
      view: 'heroic',
      stateFilter: null,
      search: '',
    });
  });

  it('trier deux fois la même colonne inverse le sens', () => {
    const byName = reducer(initialState, { type: 'SORT_BY', payload: 'name' });
    expect(byName).toMatchObject({ sortKey: 'name', sortDir: 'desc' });
    expect(reducer(byName, { type: 'SORT_BY', payload: 'name' }).sortDir).toBe('asc');
  });
});
