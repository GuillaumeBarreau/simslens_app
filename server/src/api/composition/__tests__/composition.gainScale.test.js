import { afterAll, describe, expect, it } from 'vitest';

/**
 * SIMS-202 : les gains bruts HPS (QE Live) et DPS (Raidbots) sont mis à
 * l'échelle séparément avant d'entrer dans le score de composition.
 */

const { gainMetricOf, normalize, normalizeWithinMetric } = require('../composition.gainScale');

describe('normalize', () => {
  it('ramène les valeurs dans [0, 1] ; 0 partout si elles sont égales', () => {
    expect(normalize([10, 20, 30])).toEqual([0, 0.5, 1]);
    expect(normalize([5, 5])).toEqual([0, 0]);
  });
});

describe('gainMetricOf', () => {
  it('« hps » seulement si explicite', () => {
    expect(gainMetricOf('hps')).toBe('hps');
    expect(gainMetricOf('dps')).toBe('dps');
    expect(gainMetricOf(null)).toBe('dps');
    expect(gainMetricOf(undefined)).toBe('dps');
  });
});

describe('normalizeWithinMetric', () => {
  it('met à l’échelle chaque grandeur séparément', () => {
    // DPS : 0, 5000, 10000 ; HPS : 100, 300.
    expect(
      normalizeWithinMetric([0, 100, 5000, 300, 10000], ['dps', 'hps', 'dps', 'hps', null]),
    ).toEqual([0, 0, 0.5, 1, 1]);
  });

  it('équivaut à normalize quand toutes les grandeurs sont égales', () => {
    const values = [3, 9, 6];
    expect(normalizeWithinMetric(values, [null, 'dps', undefined])).toEqual(normalize(values));
  });
});

// La composition elle-même : les soigneurs sont départagés sur leurs HPS
// sans que les DPS des autres candidats n'écrasent l'échelle.
const upgradeServicePath = require.resolve('../../item_upgrade/item_upgrade.service');
const servicePath = require.resolve('../composition.service');
delete require.cache[servicePath];
require.cache[upgradeServicePath] = {
  id: upgradeServicePath,
  filename: upgradeServicePath,
  loaded: true,
  exports: { getCharacterBossUpgrades: async () => [] },
};
const service = require('../composition.service');

afterAll(() => {
  delete require.cache[upgradeServicePath];
  delete require.cache[servicePath];
});

const player = (characterId, cls, spec, granularRole, perBoss = {}) => ({
  characterId,
  name: `P${characterId}`,
  userId: `user-${characterId}`,
  class: cls,
  spec,
  granularRole,
  perBoss,
});

describe('composition — gains HPS', () => {
  // Mis à l'échelle avec les DPS bruts (20 000), les gains HPS seraient
  // écrasés vers 0 et l'historique de P3 l'emporterait. Mis à l'échelle entre
  // soigneurs, le meilleur gain HPS (P4) compte pleinement.
  it('le gain HPS d’un soigneur n’est pas écrasé par les DPS bruts des autres', () => {
    const gain = (bestGain, metric) => ({
      100: { bestGain, expectedGain: 0, bisCount: 0, metric },
    });
    const pool = [
      player(1, 'warrior', 'Protection', 'TANK'),
      player(2, 'paladin', 'Protection', 'TANK'),
      player(3, 'priest', 'Holy', 'HEALER', gain(200, 'hps')),
      player(4, 'druid', 'Restoration', 'HEALER', gain(800, 'hps')),
      player(5, 'rogue', 'Outlaw', 'MELEE', gain(20000, 'dps')),
      player(6, 'mage', 'Frost', 'RANGED', gain(15000, 'dps')),
    ];
    const context = {
      schemaVersion: 1,
      event: { difficulty: 'heroic', raid: null },
      bosses: [{ id: 100, name: 'Boss' }],
      pool,
      unplaced: [],
      // P3 a tenu ce boss à la seule soirée de l'historique.
      history: {
        eventsFound: 1,
        events: [
          {
            perBoss: {
              100: { TANK: 2, HEALER: 1, MELEE: 1, RANGED: 1, members: [{ characterId: 3 }] },
            },
          },
        ],
      },
      constraints: { activeBuffs: [] },
    };
    // Cap 5 : 2 tanks, 1 soigneur, 1 mêlée, 1 distance.
    const result = service.generateFromContext(context, {
      weights: { buffs: 0, upgrades: 0.3, history: 0.2 },
      sizeOverride: 5,
    });
    const healers = result.bosses[0].assignments.filter((a) => a.role === 'HEALER');
    expect(healers.map((a) => a.characterId)).toEqual([4]);
  });
});
