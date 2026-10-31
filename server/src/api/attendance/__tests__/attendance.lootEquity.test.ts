import type { EquityCharacter, EquitySim, LootEquityInput } from '../attendance.lootEquity';
import {
  aggregateGainMetric,
  buildLootEquity,
  difficultyFromInstance,
  inclusiveEnd,
  isAttributiveResponse,
  parseLootDate,
  percentGain,
  pickSimAtDrop,
} from '../attendance.lootEquity';

const range = {
  startDate: new Date('2026-05-01T00:00:00Z'),
  endDate: new Date('2026-05-31T23:59:59.999Z'),
};

function character(overrides: Partial<EquityCharacter> = {}): EquityCharacter {
  return {
    id: 1,
    name: 'Thrall',
    class: 'shaman',
    thumbnail: null,
    specializationId: 262,
    specName: 'Elemental',
    specRole: 'dps',
    ...overrides,
  };
}

function sim(overrides: Partial<EquitySim> = {}): EquitySim {
  return {
    characterId: 1,
    itemId: 100,
    dps: 1020,
    baseDps: 1000,
    timeStamp: new Date('2026-05-10T12:00:00Z'),
    difficulty: 'heroic',
    spec: 'Elemental Shaman',
    ...overrides,
  };
}

function input(overrides: Partial<LootEquityInput> = {}): LootEquityInput {
  return {
    range,
    characters: [character()],
    loots: [],
    items: [{ id: 100, name: 'Ring', icon: 'inv_ring' }],
    sims: [],
    wishlists: [],
    tokenRewards: [],
    attendance: [],
    ...overrides,
  };
}

function loot(id: number, date: string, itemId = 100, extra: Record<string, unknown> = {}) {
  return {
    id,
    characterId: 1,
    itemId,
    date,
    time: '21:00:00',
    response: 'BiS',
    instance: 'Manaforge Omega-Heroic',
    ...extra,
  };
}

describe('parseLootDate', () => {
  it('reads the addon format dd/mm/yy with its time', () => {
    expect(parseLootDate('12/05/26', '20:34:12')?.toISOString()).toBe('2026-05-12T20:34:12.000Z');
  });

  it('reads dd/mm/yyyy and ISO-like yyyy-mm-dd', () => {
    expect(parseLootDate('12/05/2026', null)?.toISOString()).toBe('2026-05-12T00:00:00.000Z');
    expect(parseLootDate('2026-05-12', '8:05')?.toISOString()).toBe('2026-05-12T08:05:00.000Z');
  });

  it.each([null, '', 'yesterday', '31/02/26', '12/13/26', '12/05'])(
    'returns null for an unreadable date (%s)',
    (date) => {
      expect(parseLootDate(date, '20:00:00')).toBeNull();
    },
  );

  it('rejects an impossible time', () => {
    expect(parseLootDate('12/05/26', '25:00:00')).toBeNull();
  });
});

describe('difficultyFromInstance', () => {
  it.each([
    ['Manaforge Omega-Mythic', 'mythic'],
    ['Manaforge Omega-Heroic', 'heroic'],
    ['Manaforge Omega-Normal', 'normal'],
    ['Manaforge Omega-Raid Finder', 'lfr'],
    ['Manaforge Omega', null],
    [null, null],
  ])('%s -> %s', (instance, expected) => {
    expect(difficultyFromInstance(instance)).toBe(expected);
  });
});

describe('percentGain', () => {
  it('computes the gain like the front ((dps - base) / base)', () => {
    expect(percentGain(1050, 1000)).toBeCloseTo(5);
    expect(percentGain(990, 1000)).toBeCloseTo(-1);
  });

  it('returns null without a usable baseline', () => {
    expect(percentGain(1000, 0)).toBeNull();
    expect(percentGain(Number.NaN, 1000)).toBeNull();
  });
});

describe('inclusiveEnd', () => {
  it('extends a bare date to the end of that day', () => {
    expect(inclusiveEnd(new Date('2026-05-31T00:00:00Z')).toISOString()).toBe(
      '2026-05-31T23:59:59.999Z',
    );
  });

  it('keeps an end that already has a time', () => {
    const end = new Date('2026-05-31T18:30:00Z');
    expect(inclusiveEnd(end)).toBe(end);
  });
});

describe('isAttributiveResponse', () => {
  it.each(['BiS', 'Upgrade', 'Off-spec', null, ''])('counts %s as an award', (response) => {
    expect(isAttributiveResponse(response)).toBe(true);
  });

  it.each(['Disenchant', ' banking ', 'Banque', 'Free', 'Transmog', 'Pass', 'AUTOPASS'])(
    'does not count %s as an award',
    (response) => {
      expect(isAttributiveResponse(response)).toBe(false);
    },
  );
});

/**
 * `upgrades` n'a pas d'historique : le worker efface les sims du même
 * (personnage, difficulté, spé) à chaque import. Un objet a donc au plus un
 * sim par (difficulté, spé), le dernier.
 */
describe('pickSimAtDrop', () => {
  const drop = new Date('2026-05-15T21:00:00Z');

  it('keeps the sim of the drop difficulty when it precedes the drop', () => {
    const heroic = sim({ timeStamp: new Date('2026-05-14T00:00:00Z') });
    expect(pickSimAtDrop([heroic], drop, 'heroic', 'Elemental')).toBe(heroic);
  });

  it('is unknown when the only sim was run after the drop', () => {
    const after = sim({ timeStamp: new Date('2026-05-16T00:00:00Z') });
    expect(pickSimAtDrop([after], drop, 'heroic', 'Elemental')).toBeNull();
  });

  it('is unknown when only another difficulty was simulated', () => {
    const mythic = sim({ difficulty: 'mythic', timeStamp: new Date('2026-05-14T00:00:00Z') });
    expect(pickSimAtDrop([mythic], drop, 'heroic', 'Elemental')).toBeNull();
  });

  it('is unknown when the difficulty of the drop cannot be read', () => {
    expect(pickSimAtDrop([sim()], drop, null, 'Elemental')).toBeNull();
  });

  it('keeps the sim of the main spec, and ignores another spec', () => {
    const main = sim({ spec: 'Elemental Shaman', dps: 1010 });
    const other = sim({ spec: 'Restoration Shaman', dps: 1200 });
    expect(pickSimAtDrop([other, main], drop, 'heroic', 'Elemental')).toBe(main);
    expect(pickSimAtDrop([other], drop, 'heroic', 'Elemental')).toBeNull();
  });

  it('ignores the spec when the sim or the character does not tell it', () => {
    const unnamed = sim({ spec: '' });
    expect(pickSimAtDrop([unnamed], drop, 'heroic', 'Elemental')).toBe(unnamed);
    const named = sim({ spec: 'Restoration Shaman' });
    expect(pickSimAtDrop([named], drop, 'heroic', null)).toBe(named);
  });

  it('is unknown without a usable sim', () => {
    expect(pickSimAtDrop([], drop, 'heroic', 'Elemental')).toBeNull();
    expect(pickSimAtDrop([sim({ baseDps: 0 })], drop, 'heroic', 'Elemental')).toBeNull();
  });

  it('compares the resolved spec ids when both are known (SIMS-210)', () => {
    // Libellé trompeur, identifiant résolu : l'identifiant fait foi.
    const main = sim({ spec: 'Restoration Shaman', specializationId: 262 });
    const other = sim({ spec: 'Elemental Shaman', specializationId: 264 });
    expect(pickSimAtDrop([other, main], drop, 'heroic', 'Elemental', 262)).toBe(main);
    // Spé du sim non résolue : retour au libellé.
    const unresolved = sim({ spec: 'Elemental Shaman', specializationId: null });
    expect(pickSimAtDrop([unresolved], drop, 'heroic', 'Elemental', 262)).toBe(unresolved);
  });

  it('takes the current sim when the drop date is unknown', () => {
    const after = sim({ timeStamp: new Date('2026-06-01T00:00:00Z') });
    expect(pickSimAtDrop([after], null, 'heroic', 'Elemental')).toBe(after);
  });
});

describe('buildLootEquity', () => {
  it('lists the items received in the period, with their simulated gain', () => {
    const [player] = buildLootEquity(
      input({
        loots: [loot(1, '10/05/26'), loot(2, '20/05/26')],
        // Le seul sim de l'objet : postérieur au premier drop, antérieur au second.
        sims: [sim({ timeStamp: new Date('2026-05-15T00:00:00Z'), dps: 1020 })],
      }),
    );

    expect(player).toMatchObject({
      characterId: 1,
      role: 'RANGED',
      itemsReceived: 2,
      knownGainCount: 1,
      averageGainPercent: 2,
      cumulativeGainPercent: 2,
    });
    // Le plus récent d'abord.
    expect(player.items.map((i) => [i.lootId, i.gainPercent])).toEqual([
      [2, 2],
      [1, null],
    ]);
    expect(player.items[0]).toMatchObject({
      itemName: 'Ring',
      isBis: false,
      gainSource: 'estimated',
    });
    expect(player.items[1].gainSource).toBeNull();
  });

  describe('gain figé à l’import (SIMS-229)', () => {
    const frozen = {
      frozenGainPercent: 3.1234,
      frozenSimAt: new Date('2026-05-08T10:00:00Z'),
    };

    it('prefers the frozen gain over the current sim', () => {
      const [player] = buildLootEquity(
        input({
          loots: [loot(1, '20/05/26', 100, frozen)],
          // Sim antérieur au drop, mais plus récent que celui figé : ignoré.
          sims: [sim({ timeStamp: new Date('2026-05-15T00:00:00Z'), dps: 1100 })],
        }),
      );
      expect(player.items[0]).toMatchObject({
        gainPercent: 3.12,
        simulatedAt: '2026-05-08T10:00:00.000Z',
        gainSource: 'frozen',
      });
      expect(player).toMatchObject({ knownGainCount: 1, averageGainPercent: 3.12 });
    });

    it('keeps the frozen gain once a new sim no longer matches the drop', () => {
      const [player] = buildLootEquity(
        input({
          loots: [loot(1, '10/05/26', 100, frozen)],
          // Le sim figé a été remplacé par un sim postérieur au drop.
          sims: [sim({ timeStamp: new Date('2026-05-12T00:00:00Z'), dps: 1000 })],
        }),
      );
      expect(player.items[0]).toMatchObject({ gainPercent: 3.12, gainSource: 'frozen' });
    });

    it('keeps a frozen zero gain instead of estimating it', () => {
      const [player] = buildLootEquity(
        input({
          loots: [loot(1, '20/05/26', 100, { frozenGainPercent: 0, frozenSimAt: null })],
          sims: [sim({ dps: 1100 })],
        }),
      );
      expect(player.items[0]).toMatchObject({
        gainPercent: 0,
        simulatedAt: null,
        gainSource: 'frozen',
      });
    });

    it('reads the frozen metric, and a frozen gain without metric as DPS', () => {
      const [player] = buildLootEquity(
        input({
          loots: [
            loot(1, '12/05/26', 100, frozen),
            loot(2, '20/05/26', 100, { ...frozen, frozenGainPercent: 4, frozenMetric: 'hps' }),
          ],
          // Sim courant en DPS : ignoré, le gain figé prime.
          sims: [sim({ dps: 1500 })],
        }),
      );
      expect(
        player.items.map((i) => [i.lootId, i.gainPercent, i.gainMetric, i.gainSource]),
      ).toEqual([
        [2, 4, 'hps', 'frozen'],
        [1, 3.12, 'dps', 'frozen'],
      ]);
      // Une seule grandeur agrégée : celle du gain connu le plus récent.
      expect(player).toMatchObject({
        gainMetric: 'hps',
        knownGainCount: 1,
        averageGainPercent: 4,
        cumulativeGainPercent: 4,
      });
    });

    it('keeps the HPS metric of a frozen gain once the current sim is DPS', () => {
      const [player] = buildLootEquity(
        input({
          loots: [loot(1, '20/05/26', 100, { ...frozen, frozenMetric: 'hps' })],
          sims: [sim({ metric: 'dps' })],
        }),
      );
      expect(player.items[0]).toMatchObject({ gainMetric: 'hps', gainSource: 'frozen' });
    });

    it('falls back to the estimate for a drop imported before the feature', () => {
      const [player] = buildLootEquity(
        input({
          loots: [loot(1, '20/05/26', 100, { frozenGainPercent: null, frozenSimAt: null })],
          sims: [sim({ dps: 1050 })],
        }),
      );
      expect(player.items[0]).toMatchObject({
        gainPercent: 5,
        gainMetric: 'dps',
        gainSource: 'estimated',
      });
    });
  });

  it('leaves out the non-attributive responses, from the items and from the BiS', () => {
    const [player] = buildLootEquity(
      input({
        loots: [
          loot(1, '10/05/26', 100, { response: 'Disenchant' }),
          loot(2, '11/05/26', 101, { response: 'Banking' }),
          loot(3, '12/05/26', 102, { response: 'Upgrade' }),
        ],
        wishlists: [
          { characterId: 1, specializationId: 262, itemId: 100 },
          { characterId: 1, specializationId: 262, itemId: 102 },
        ],
      }),
    );
    expect(player.items.map((i) => i.lootId)).toEqual([3]);
    expect(player).toMatchObject({ bisObtained: 1, bisTotal: 2 });
  });

  it('marks the gain as unknown when the sim covers another difficulty', () => {
    const [player] = buildLootEquity(
      input({
        loots: [loot(1, '20/05/26', 100, { instance: 'Manaforge Omega-Mythic' })],
        sims: [sim({ difficulty: 'heroic' })],
      }),
    );
    expect(player.items[0].gainPercent).toBeNull();
  });

  it('marks the gain as unknown when no sim covers the item', () => {
    const [player] = buildLootEquity(input({ loots: [loot(1, '10/05/26')] }));
    expect(player.items[0].gainPercent).toBeNull();
    expect(player.items[0].simulatedAt).toBeNull();
    expect(player).toMatchObject({
      knownGainCount: 0,
      averageGainPercent: null,
      cumulativeGainPercent: null,
    });
  });

  it('leaves out the items received outside the period or without a readable date', () => {
    const [player] = buildLootEquity(
      input({
        loots: [loot(1, '10/04/26'), loot(2, '15/05/26'), loot(3, '02/06/26'), loot(4, 'n/a')],
      }),
    );
    expect(player.items.map((i) => i.lootId)).toEqual([2]);
  });

  it('computes the BiS fill rate on the primary spec, up to the end of the period', () => {
    const [player] = buildLootEquity(
      input({
        loots: [loot(1, '10/04/26', 100), loot(2, '15/05/26', 101), loot(3, '02/06/26', 102)],
        wishlists: [
          { characterId: 1, specializationId: 262, itemId: 100 },
          { characterId: 1, specializationId: 262, itemId: 101 },
          { characterId: 1, specializationId: 262, itemId: 102 },
          { characterId: 1, specializationId: 262, itemId: 103 },
          // Autre spé : ignorée.
          { characterId: 1, specializationId: 264, itemId: 104 },
        ],
      }),
    );
    expect(player).toMatchObject({
      bisReceived: 1,
      bisObtained: 2,
      bisTotal: 4,
      bisFillRate: 0.5,
    });
  });

  it('uses every spec of the wishlist when the character has no primary spec', () => {
    const [player] = buildLootEquity(
      input({
        characters: [character({ specializationId: null, specName: null, specRole: null })],
        loots: [loot(1, '15/05/26', 100)],
        wishlists: [{ characterId: 1, specializationId: 264, itemId: 100 }],
      }),
    );
    expect(player).toMatchObject({ bisObtained: 1, bisTotal: 1, bisFillRate: 1 });
  });

  it('resolves a tier token to the pieces it gives to the class', () => {
    const [player] = buildLootEquity(
      input({
        loots: [loot(1, '15/05/26', 500)],
        tokenRewards: [
          { tokenItemId: 500, rewardItemId: 600, class: 'shaman' },
          { tokenItemId: 500, rewardItemId: 700, class: 'hunter' },
        ],
        sims: [sim({ itemId: 600, dps: 1100 }), sim({ itemId: 700, dps: 2000 })],
        wishlists: [{ characterId: 1, specializationId: 262, itemId: 600 }],
      }),
    );
    expect(player.items[0]).toMatchObject({ itemId: 500, gainPercent: 10, isBis: true });
    expect(player.bisFillRate).toBe(1);
  });

  it('reports the presence of the period', () => {
    const [player] = buildLootEquity(
      input({ attendance: [{ characterId: 1, present: 3, totalRaids: 4 }] }),
    );
    expect(player).toMatchObject({
      itemsReceived: 0,
      present: 3,
      totalRaids: 4,
      presenceRate: 0.75,
    });
  });

  it('skips the characters with neither loot nor expected raid in the period', () => {
    expect(
      buildLootEquity(input({ attendance: [{ characterId: 1, present: 0, totalRaids: 0 }] })),
    ).toEqual([]);
  });

  it('keeps a player who received loot without any raid expected, presence unknown', () => {
    const [player] = buildLootEquity(input({ loots: [loot(1, '15/05/26')] }));
    expect(player.presenceRate).toBeNull();
  });

  it('only counts the loots of the character itself, sorted by name', () => {
    const players = buildLootEquity(
      input({
        characters: [character({ id: 2, name: 'Zul' }), character({ id: 1, name: 'Anduin' })],
        loots: [loot(1, '15/05/26'), { ...loot(2, '16/05/26'), characterId: 2 }],
      }),
    );
    expect(players.map((p) => [p.name, p.items.map((i) => i.lootId)])).toEqual([
      ['Anduin', [1]],
      ['Zul', [2]],
    ]);
  });
});

// SIMS-202 : gains HPS des sims QE Live de soigneur.
describe('buildLootEquity — gains HPS', () => {
  const healer = character({ specializationId: 264, specName: null, specRole: 'healer' });

  it('marque « hps » le gain d’un sim QE Live', () => {
    const [player] = buildLootEquity(
      input({
        characters: [healer],
        loots: [loot(1, '20/05/26')],
        sims: [sim({ spec: 'Restoration Shaman', metric: 'hps' })],
      }),
    );
    expect(player.items[0]).toMatchObject({ gainPercent: 2, gainMetric: 'hps' });
    expect(player).toMatchObject({ gainMetric: 'hps', averageGainPercent: 2, knownGainCount: 1 });
  });

  it('n’additionne pas des % de DPS et de HPS : agrège la grandeur la plus récente', () => {
    const [player] = buildLootEquity(
      input({
        characters: [healer],
        items: [
          { id: 100, name: 'Ring', icon: 'inv_ring' },
          { id: 200, name: 'Staff', icon: 'inv_staff' },
        ],
        loots: [loot(1, '12/05/26', 100), loot(2, '25/05/26', 200)],
        sims: [
          // Ancien sim Raidbots (DPS) de l'anneau, puis sim QE (HPS) du bâton.
          sim({ itemId: 100, dps: 1100, timeStamp: new Date('2026-05-10T12:00:00Z') }),
          sim({
            itemId: 200,
            dps: 1030,
            metric: 'hps',
            timeStamp: new Date('2026-05-20T12:00:00Z'),
          }),
        ],
      }),
    );
    expect(player.items.map((i) => [i.lootId, i.gainPercent, i.gainMetric])).toEqual([
      [2, 3, 'hps'],
      [1, 10, 'dps'],
    ]);
    expect(player).toMatchObject({
      gainMetric: 'hps',
      knownGainCount: 1,
      averageGainPercent: 3,
      cumulativeGainPercent: 3,
    });
  });

  it('sans gain connu, la grandeur est null', () => {
    const [player] = buildLootEquity(input({ loots: [loot(1, '15/05/26')] }));
    expect(player.gainMetric).toBeNull();
    expect(player.items[0].gainMetric).toBeNull();
  });
});

describe('aggregateGainMetric', () => {
  it('prend la grandeur du dernier gain connu', () => {
    expect(
      aggregateGainMetric([{ gainMetric: 'hps' }, { gainMetric: 'dps' }, { gainMetric: null }]),
    ).toBe('dps');
    expect(aggregateGainMetric([{ gainMetric: null }])).toBeNull();
    expect(aggregateGainMetric([])).toBeNull();
  });
});
