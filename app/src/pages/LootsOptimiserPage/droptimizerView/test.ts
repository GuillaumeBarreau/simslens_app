import type { UpgradeBatchRow, UpgradesByItem } from 'types/upgrade.types';
import { describe, expect, it } from 'vitest';

import { initialState, reducer } from '../LootsOptimiserPage.reducers';
import {
  countInterestingItems,
  countRows,
  emptyReason,
  formatGain,
  gainPercent,
  gainSign,
  matchesRoleFilter,
  ownsItem,
  parseBossIndex,
  rowRole,
  summarizeGains,
  summarizeWishesByItem,
  summarizeWishesByPlayer,
} from '.';

const row = (overrides: Partial<UpgradeBatchRow> = {}): UpgradeBatchRow => ({
  dps: 102000,
  baseDps: 100000,
  name: 'Alpha',
  characterId: 1,
  timeStamp: new Date(0),
  equippedItems: [],
  ...overrides,
});

const owner = (itemId: number, ilevel = 700) => ({
  equippedItems: [{ itemId, ilevel, slot: 'head', item: { id: itemId, name: 'x', icon: 'x' } }],
});

const item = (id: number, name = `Item ${id}`) => ({ id, name, icon: 'icon' });

describe('matchesRoleFilter', () => {
  it('garde tout sans filtre ou sans rôle connu', () => {
    expect(matchesRoleFilter('tank', 'all')).toBe(true);
    expect(matchesRoleFilter(null, 'heals')).toBe(true);
  });

  it('regroupe mêlée et distance sous DPS', () => {
    expect(matchesRoleFilter('melee', 'dps')).toBe(true);
    expect(matchesRoleFilter('Ranged', 'dps')).toBe(true);
    expect(matchesRoleFilter('healer', 'dps')).toBe(false);
    expect(matchesRoleFilter('healer', 'heals')).toBe(true);
    expect(matchesRoleFilter('tank', 'tanks')).toBe(true);
    expect(matchesRoleFilter('melee', 'tanks')).toBe(false);
  });
});

describe('rowRole', () => {
  it('préfère le rôle de la spé simulée à celui du personnage', () => {
    expect(
      rowRole({
        simSpecialization: { id: 1, name: 'Holy', role: 'healer' },
        specialization: { role: 'melee' },
      }),
    ).toBe('healer');
    expect(rowRole({ specialization: { role: 'tank' } })).toBe('tank');
    expect(rowRole({})).toBeNull();
  });
});

describe('gain', () => {
  it('calcule le gain en pourcentage, inconnu sans DPS de base', () => {
    expect(gainPercent({ dps: 103000, baseDps: 100000 })).toBeCloseTo(3);
    expect(gainPercent({ dps: 103000, baseDps: 0 })).toBeNull();
    expect(gainPercent({ dps: null as unknown as number, baseDps: 100000 })).toBeNull();
  });

  it('formate le gain sans afficher de « -0.0 »', () => {
    expect(formatGain(2.345)).toBe('+2.3 %');
    expect(formatGain(-1.27)).toBe('-1.3 %');
    expect(formatGain(-0.04)).toBe('0.0 %');
    expect(formatGain(null)).toBe('?');
    expect(gainSign(-0.04)).toBe('zero');
    expect(gainSign(0.4)).toBe('positive');
    expect(gainSign(-0.4)).toBe('negative');
    expect(gainSign(null)).toBe('unknown');
  });
});

describe('ownsItem', () => {
  it("ne compte l'objet possédé qu'au niveau d'objet de la difficulté ou au-dessus", () => {
    expect(ownsItem(owner(10, 700), 10, 700)).toBe(true);
    expect(ownsItem(owner(10, 680), 10, 700)).toBe(false);
    expect(ownsItem(owner(11, 720), 10, 700)).toBe(false);
  });
});

describe('summarizeGains', () => {
  const data: UpgradesByItem = {
    '1': [
      row({ name: 'A', characterId: 1, dps: 101000 }),
      row({ name: 'B', characterId: 2, dps: 104000 }),
      row({ name: 'C', characterId: 3, ...owner(1) }),
    ],
    '2': [
      row({ name: 'A', characterId: 1, dps: 105000, specialization: { role: 'tank' } }),
      row({ name: 'D', characterId: 4, dps: 100500 }),
      row({ name: 'E', characterId: 5, dps: 100100 }),
    ],
    '3': [],
  };

  it('classe les objets par nombre de joueurs qui y gagnent, puis par meilleur gain', () => {
    const result = summarizeGains([item(1), item(2), item(3)], data, {
      roleFilter: 'all',
      itemLevel: 700,
    });
    expect(result.map((r) => r.item.id)).toEqual([2, 1]);
    expect(result[1].interested.map((p) => p.row.name)).toEqual(['B', 'A']);
    expect(result[1].owned.map((r) => r.name)).toEqual(['C']);
  });

  it("n'affiche qu'une fois un joueur présent sur plusieurs lignes, avec son meilleur gain", () => {
    const result = summarizeGains(
      [item(7)],
      {
        '7': [
          row({ name: 'A', characterId: 1, dps: 101000 }),
          row({ name: 'A', characterId: 1, dps: 103000 }),
          row({ name: 'B', characterId: 2, dps: 102000 }),
          row({ name: 'C', characterId: 3, dps: 104000 }),
          row({ name: 'C', characterId: 3, ...owner(7) }),
        ],
      },
      { roleFilter: 'all', itemLevel: 700 },
    );
    expect(result[0].interested.map((p) => [p.row.name, p.gain])).toEqual([
      ['A', expect.closeTo(3)],
      ['B', expect.closeTo(2)],
    ]);
    expect(result[0].owned.map((r) => r.name)).toEqual(['C']);
    expect(result[0].rows).toHaveLength(3);
  });

  it('applique le filtre de rôle aux lignes', () => {
    const result = summarizeGains([item(2)], data, { roleFilter: 'tanks', itemLevel: 700 });
    expect(result[0].interested.map((p) => p.row.name)).toEqual(['A', 'D', 'E']);
    const dps = summarizeGains(
      [item(2)],
      { '2': [row({ name: 'T', simSpecialization: { id: 1, name: 'Prot', role: 'tank' } })] },
      { roleFilter: 'dps', itemLevel: 700 },
    );
    expect(dps).toEqual([]);
  });
});

describe('vues wishlist', () => {
  const players = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
    { id: 3, name: 'C' },
  ];
  const data: UpgradesByItem = {
    '1': [
      row({ name: 'A', characterId: 1, isWishlist: 1, dps: 101000 }),
      row({ name: 'B', characterId: 2, isWishlist: 1, ...owner(1) }),
      row({ name: 'C', characterId: 3, isWishlist: 0 }),
    ],
    '2': [
      row({
        name: 'A',
        characterId: 1,
        isWishlist: 1,
        dps: 103000,
        simSpecialization: { id: 1, name: 'Frost', role: 'ranged' },
      }),
    ],
  };

  it('par objet : séparent ceux qui le veulent de ceux qui l’ont déjà', () => {
    const result = summarizeWishesByItem([item(1), item(2)], data, players, 700);
    const first = result.find((r) => r.item.id === 1);
    expect(first?.interested.map((e) => e.player.name)).toEqual(['A']);
    expect(first?.owned.map((e) => e.player.name)).toEqual(['B']);
  });

  it('par joueur : objets voulus triés par gain et spé simulée', () => {
    const result = summarizeWishesByPlayer([item(1), item(2)], data, players, 700);
    expect(result.map((r) => r.player.name)).toEqual(['A', 'B']);
    expect(result[0].needed.map((e) => e.item.id)).toEqual([2, 1]);
    expect(result[0].simulatedSpec).toBe('Frost');
    expect(result[1].obtained.map((e) => e.item.id)).toEqual([1]);
  });

  it('compte les objets voulus par boss parmi les joueurs filtrés', () => {
    const options = { view: 'wishlist' as const, roleFilter: 'all' as const, itemLevel: 700 };
    expect(countInterestingItems([1, 2], data, { ...options, players })).toBe(2);
    expect(countInterestingItems([1, 2], data, { ...options, players: [players[1]] })).toBe(0);
  });
});

describe('compteurs', () => {
  const data: UpgradesByItem = {
    '1': [row({ name: 'A' }), row({ name: 'B', ...owner(1) })],
    '2': [row({ name: 'C', ...owner(2) })],
  };

  it('compte les objets avec au moins un gain non possédé', () => {
    const options = { view: 'standard' as const, roleFilter: 'all' as const, itemLevel: 700 };
    expect(countInterestingItems([1, 2, 3], data, options)).toBe(1);
    expect(countInterestingItems([1], data, { ...options, roleFilter: 'tanks' })).toBe(1);
  });

  it('compte les lignes, avec un prédicat facultatif', () => {
    expect(countRows([1, 2, 3], data)).toBe(3);
    expect(countRows([1, 2], data, (r) => r.name === 'A')).toBe(1);
  });
});

describe('emptyReason', () => {
  const base = {
    view: 'standard' as const,
    itemCount: 5,
    searchActive: false,
    raidRowCount: 10,
    scopeRowCount: 3,
    visibleCount: 0,
  };

  it('ne renvoie rien quand du contenu est affiché', () => {
    expect(emptyReason({ ...base, visibleCount: 2 })).toBeNull();
  });

  it('explique pourquoi la liste est vide', () => {
    expect(emptyReason({ ...base, itemCount: 0 })).toBe('no_loot');
    expect(emptyReason({ ...base, itemCount: 0, searchActive: true })).toBe('no_match');
    expect(emptyReason({ ...base, raidRowCount: 0 })).toBe('no_sims');
    expect(emptyReason({ ...base, view: 'wishlist', raidRowCount: 0 })).toBe('no_wishes');
    expect(emptyReason({ ...base, scopeRowCount: 0 })).toBe('boss_empty');
    expect(emptyReason(base)).toBe('role_filtered');
  });
});

describe('parseBossIndex', () => {
  it('lit l’index du boss dans l’URL', () => {
    expect(parseBossIndex('all', 10)).toBe('all');
    expect(parseBossIndex(undefined, 10)).toBe(0);
    expect(parseBossIndex('3', 10)).toBe(3);
    expect(parseBossIndex('3', 0)).toBe(3);
  });

  it('rejette un index hors du raid ou invalide', () => {
    expect(parseBossIndex('10', 10)).toBe('invalid');
    expect(parseBossIndex('-1', 10)).toBe('invalid');
    expect(parseBossIndex('abc', 10)).toBe('invalid');
  });
});

describe('reducer', () => {
  it('change la vue, le regroupement et le filtre de rôle', () => {
    let state = reducer(initialState, { type: 'SET_VIEW_MODE', payload: 'wishlist' });
    state = reducer(state, { type: 'SET_GROUP_BY', payload: 'player' });
    state = reducer(state, { type: 'SET_ROLE_FILTER', payload: 'heals' });
    expect(state).toMatchObject({ viewMode: 'wishlist', groupBy: 'player', roleFilter: 'heals' });
  });
});
