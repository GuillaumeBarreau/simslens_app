import { afterAll, describe, expect, it } from 'vitest';

/**
 * Postes comblés hors spé (SIMS-222) : depuis SIMS-207, l'auto-composition
 * peut placer un candidat dans un rôle que sa classe tient mais qui n'est pas
 * celui de sa spé. L'affectation est marquée `offspec`, un avertissement
 * `role_offspec_fill` est émis, et `role_short` compte les vrais candidats du
 * rôle (hors spé exclus).
 */

// item_upgrade.service requiert un module .ts, que require() ne charge pas
// sous vitest (cf. routesLoad.test.ts) : on le remplace dans le cache avant
// de charger le service de composition.
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

const player = (characterId, name, cls, spec, granularRole) => ({
  characterId,
  name,
  userId: `user-${characterId}`,
  class: cls,
  spec,
  granularRole,
  perBoss: {},
});

const PROT = player(1, 'Shieldy', 'warrior', 'Protection', 'TANK');
const FURY = player(2, 'Furyo', 'warrior', 'Fury', 'MELEE');
const HOLY = player(3, 'Holyp', 'priest', 'Holy', 'HEALER');
const MAGE = player(4, 'Frosty', 'mage', 'Frost', 'RANGED');
const ROGUE = player(5, 'Stabby', 'rogue', 'Outlaw', 'MELEE');

const NO_BUFF_WEIGHTS = { buffs: 0, upgrades: 0.3, history: 0.2 };

function generate(pool, bosses = [{ id: 100, name: 'Boss' }]) {
  const context = {
    schemaVersion: 1,
    event: { difficulty: 'heroic', raid: null },
    bosses,
    pool,
    unplaced: [],
    history: { eventsFound: 0, events: [] },
    constraints: { activeBuffs: [] },
  };
  // Cap 5 : 2 tanks, 1 soigneur, 1 mêlée, 1 distance.
  return service.generateFromContext(context, { weights: NO_BUFF_WEIGHTS, sizeOverride: 5 });
}

const byType = (result, type) => result.warnings.filter((w) => w.type === type);

describe('composition — off-spec fill', () => {
  it('marks the assignment filled by an off-spec candidate', () => {
    const result = generate([PROT, FURY, HOLY, MAGE, ROGUE]);
    const assignments = result.bosses[0].assignments;

    expect(assignments.find((a) => a.characterId === 2)).toMatchObject({
      role: 'TANK',
      offspec: true,
    });
    for (const a of assignments.filter((a) => a.characterId !== 2)) {
      expect(a.offspec).toBe(false);
    }
  });

  it('warns with the role, the player and his main role', () => {
    const result = generate([PROT, FURY, HOLY, MAGE, ROGUE]);

    expect(byType(result, 'role_offspec_fill')).toEqual([
      {
        type: 'role_offspec_fill',
        role: 'TANK',
        bossId: 100,
        characterId: 2,
        characterName: 'Furyo',
        primaryRole: 'MELEE',
      },
    ]);
  });

  it('reports the shortage of real candidates even when off-specs fill the role', () => {
    const result = generate([PROT, FURY, HOLY, MAGE, ROGUE]);

    expect(byType(result, 'role_short')).toEqual([
      {
        type: 'role_short',
        role: 'TANK',
        bossId: 100,
        target: 2,
        available: 1,
        offspecAvailable: 1,
      },
    ]);
  });

  it('reports one off-spec fill per boss', () => {
    const result = generate(
      [PROT, FURY, HOLY, MAGE, ROGUE],
      [
        { id: 100, name: 'Boss A' },
        { id: 101, name: 'Boss B' },
      ],
    );

    expect(byType(result, 'role_offspec_fill').map((w) => [w.bossId, w.characterId])).toEqual([
      [100, 2],
      [101, 2],
    ]);
  });

  it('raises neither warning when every role has enough real candidates', () => {
    const secondTank = player(6, 'Wally', 'warrior', 'Protection', 'TANK');
    const result = generate([PROT, secondTank, HOLY, MAGE, ROGUE]);

    expect(result.bosses[0].assignments.every((a) => a.offspec === false)).toBe(true);
    expect(byType(result, 'role_offspec_fill')).toEqual([]);
    expect(byType(result, 'role_short')).toEqual([]);
  });

  it('still reports a role nobody can fill', () => {
    const result = generate([
      PROT,
      FURY,
      MAGE,
      ROGUE,
      player(7, 'Arcano', 'mage', 'Arcane', 'RANGED'),
    ]);

    expect(byType(result, 'role_short')).toContainEqual({
      type: 'role_short',
      role: 'HEALER',
      bossId: 100,
      target: 1,
      available: 0,
      offspecAvailable: 0,
    });
  });
});
