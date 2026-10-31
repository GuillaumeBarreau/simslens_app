import type { EquitySim } from '../../attendance/attendance.lootEquity';
import type { FreezeContext, FreezeLoot } from '../sync_loot.frozenGain';
import { freezeGain, isFreezable } from '../sync_loot.frozenGain';

/**
 * Gain figé à l'import (SIMS-229) : même objet, même difficulté que le drop,
 * spé principale, sim antérieur ou égal au drop — sim courant si la date du
 * drop est illisible.
 */

function sim(overrides: Partial<EquitySim> = {}): EquitySim {
  return {
    characterId: 11,
    itemId: 42,
    dps: 1030,
    baseDps: 1000,
    timeStamp: new Date('2026-05-11T18:00:00Z'),
    difficulty: 'heroic',
    spec: 'Elemental Shaman',
    specializationId: 262,
    ...overrides,
  };
}

function context(overrides: Partial<FreezeContext> = {}): FreezeContext {
  return {
    characters: new Map([
      [11, { id: 11, class: 'shaman', specializationId: 262, specName: 'Elemental' }],
    ]),
    sims: [sim()],
    tokenRewards: [],
    ...overrides,
  };
}

function loot(overrides: Partial<FreezeLoot> = {}): FreezeLoot {
  return {
    characterID: 11,
    itemID: 42,
    date: '12/05/26',
    time: '20:34:12',
    response: 'BiS',
    instance: 'Manaforge Omega-Heroic',
    ...overrides,
  };
}

describe('freezeGain', () => {
  it('freezes the gain, the date and the spec of the sim preceding the drop', () => {
    expect(freezeGain(loot(), context())).toEqual({
      upgradePercent: 3,
      upgradeSimAt: new Date('2026-05-11T18:00:00Z'),
      upgradeSpecializationId: 262,
      upgradeMetric: 'dps',
    });
  });

  it('freezes the metric of the sim: HPS for a QE Live report (SIMS-202)', () => {
    const hps = sim({ metric: 'hps', dps: 1040 });
    expect(freezeGain(loot(), context({ sims: [hps] }))).toMatchObject({
      upgradePercent: 4,
      upgradeMetric: 'hps',
    });
  });

  it('freezes DPS for a sim without metric', () => {
    expect(freezeGain(loot(), context({ sims: [sim({ metric: null })] }))?.upgradeMetric).toBe(
      'dps',
    );
  });

  it('keeps four decimals, the precision of the column', () => {
    const frozen = freezeGain(loot(), context({ sims: [sim({ dps: 1012.345678 })] }));
    expect(frozen?.upgradePercent).toBe(1.2346);
  });

  it('accepts a sim run at the very time of the drop', () => {
    const at = new Date('2026-05-12T20:34:12Z');
    expect(freezeGain(loot(), context({ sims: [sim({ timeStamp: at })] }))?.upgradeSimAt).toBe(at);
  });

  it('freezes nothing when the only sim was run after the drop', () => {
    const after = sim({ timeStamp: new Date('2026-05-13T00:00:00Z') });
    expect(freezeGain(loot(), context({ sims: [after] }))).toBeNull();
  });

  it('takes the current sim when the drop date cannot be read', () => {
    const after = sim({ timeStamp: new Date('2026-05-13T00:00:00Z') });
    expect(freezeGain(loot({ date: 'hier' }), context({ sims: [after] }))?.upgradeSimAt).toBe(
      after.timeStamp,
    );
  });

  it('freezes nothing without a sim of the item', () => {
    expect(freezeGain(loot(), context({ sims: [] }))).toBeNull();
    expect(freezeGain(loot(), context({ sims: [sim({ itemId: 43 })] }))).toBeNull();
  });

  it('only reads the sims of the character itself', () => {
    expect(freezeGain(loot(), context({ sims: [sim({ characterId: 12 })] }))).toBeNull();
  });

  it('uses the difficulty of the drop', () => {
    const mythic = sim({ difficulty: 'mythic', dps: 1080 });
    const frozen = freezeGain(
      loot({ instance: 'Manaforge Omega-Mythic' }),
      context({ sims: [sim(), mythic] }),
    );
    expect(frozen?.upgradePercent).toBe(8);
    expect(freezeGain(loot({ instance: 'Manaforge Omega-Mythic' }), context())).toBeNull();
  });

  it('reads the difficulty sent by the companion when the instance does not tell it', () => {
    expect(freezeGain(loot({ instance: 'Manaforge Omega' }), context())).toBeNull();
    expect(
      freezeGain(loot({ instance: 'Manaforge Omega', difficulty: 'Heroic' }), context()),
    ).toMatchObject({ upgradePercent: 3 });
  });

  it('ignores the sims of another spec than the main one', () => {
    const resto = sim({ spec: 'Restoration Shaman', specializationId: 264, dps: 1200 });
    expect(freezeGain(loot(), context({ sims: [resto] }))).toBeNull();
    expect(freezeGain(loot(), context({ sims: [resto, sim()] }))?.upgradePercent).toBe(3);
  });

  it('falls back to the spec of the character when the sim spec is not resolved', () => {
    const unresolved = sim({ specializationId: null });
    expect(freezeGain(loot(), context({ sims: [unresolved] }))?.upgradeSpecializationId).toBe(262);
  });

  it('resolves a tier token to the piece it gives to the class', () => {
    const frozen = freezeGain(
      loot({ itemID: 500 }),
      context({
        tokenRewards: [
          { tokenItemId: 500, rewardItemId: 600, class: 'shaman' },
          { tokenItemId: 500, rewardItemId: 700, class: 'hunter' },
        ],
        sims: [sim({ itemId: 600, dps: 1100 }), sim({ itemId: 700, dps: 2000 })],
      }),
    );
    expect(frozen?.upgradePercent).toBe(10);
  });

  it.each(['Disenchant', 'Banking', 'Transmog', 'Pass'])(
    'freezes nothing for a non-attributive response (%s)',
    (response) => {
      expect(freezeGain(loot({ response }), context())).toBeNull();
    },
  );

  it('freezes nothing for an unmatched player or an unknown character', () => {
    expect(freezeGain(loot({ characterID: null }), context())).toBeNull();
    expect(freezeGain(loot({ characterID: 99 }), context())).toBeNull();
  });
});

describe('isFreezable', () => {
  it('needs a character, an item and an awarding response', () => {
    expect(isFreezable(loot())).toBe(true);
    expect(isFreezable(loot({ response: null }))).toBe(true);
    expect(isFreezable(loot({ characterID: null }))).toBe(false);
    expect(isFreezable(loot({ response: 'Disenchant' }))).toBe(false);
  });
});
