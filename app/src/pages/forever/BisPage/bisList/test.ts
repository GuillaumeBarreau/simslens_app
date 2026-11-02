import type { BisSlot } from 'services/bis.service';

import {
  addBisItem,
  getBisOrigins,
  groupBisSlots,
  hasAnyBisItem,
  MAX_BIS_ITEMS_PER_SLOT,
  moveBisItem,
  parseWowheadItemId,
  resolveBisSpecId,
  toSaveItems,
} from '.';

const slot = (overrides: Partial<BisSlot> & { slot: string }): BisSlot => ({
  source: null,
  season: null,
  items: [],
  ...overrides,
});

describe('parseWowheadItemId', () => {
  it('lit un ID saisi', () => {
    expect(parseWowheadItemId('19019')).toBe(19019);
    expect(parseWowheadItemId('  19019 ')).toBe(19019);
  });

  it('extrait l’ID d’une URL Wowhead collée', () => {
    expect(parseWowheadItemId('https://www.wowhead.com/forever/item=19019')).toBe(19019);
    expect(
      parseWowheadItemId('https://www.wowhead.com/forever/item=19019/thunderfury-blessed-blade'),
    ).toBe(19019);
    expect(parseWowheadItemId('https://www.wowhead.com/forever/fr/item=16921?bonus=1')).toBe(16921);
    expect(parseWowheadItemId('wowhead.com/?item=12345')).toBe(12345);
  });

  it('refuse une saisie vide, nulle ou sans objet', () => {
    expect(parseWowheadItemId('')).toBeNull();
    expect(parseWowheadItemId('   ')).toBeNull();
    expect(parseWowheadItemId('0')).toBeNull();
    expect(parseWowheadItemId('-3')).toBeNull();
    expect(parseWowheadItemId('12.5')).toBeNull();
    expect(parseWowheadItemId('thunderfury')).toBeNull();
    expect(parseWowheadItemId('https://www.wowhead.com/forever/npc=11502')).toBeNull();
    expect(parseWowheadItemId('https://www.wowhead.com/forever/itemset=209')).toBeNull();
  });
});

describe('moveBisItem', () => {
  const items = ['a', 'b', 'c'];

  it('monte et descend un objet d’un rang', () => {
    expect(moveBisItem(items, 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveBisItem(items, 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('ne sort pas des bornes et ne modifie pas la liste d’origine', () => {
    expect(moveBisItem(items, 0, -1)).toEqual(items);
    expect(moveBisItem(items, 2, 1)).toEqual(items);
    expect(moveBisItem(items, 5, -1)).toEqual(items);
    moveBisItem(items, 0, 1);
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

describe('addBisItem', () => {
  it('ajoute en dernier rang avec la note nettoyée', () => {
    const result = addBisItem([{ itemId: 1, note: null }], 'item=2', '  Pré-BiS ');
    expect(result.items).toEqual([
      { itemId: 1, note: null },
      { itemId: 2, note: 'Pré-BiS' },
    ]);
    expect(addBisItem([], '3', ' ').items).toEqual([{ itemId: 3, note: null }]);
  });

  it('refuse un ID illisible, un doublon ou une sixième entrée', () => {
    expect(addBisItem([], 'abc', '').error).toBe('invalid');
    expect(addBisItem([{ itemId: 7, note: null }], '7', '').error).toBe('duplicate');
    const full = Array.from({ length: MAX_BIS_ITEMS_PER_SLOT }, (_, i) => ({
      itemId: i + 1,
      note: null,
    }));
    expect(addBisItem(full, '99', '').error).toBe('full');
  });
});

describe('toSaveItems', () => {
  it('garde l’ordre et omet les notes vides', () => {
    expect(
      toSaveItems([
        { itemId: 2, note: ' ' },
        { itemId: 1, note: 'Alt' },
        { itemId: 3, note: null },
      ]),
    ).toEqual([{ itemId: 2 }, { itemId: 1, note: 'Alt' }, { itemId: 3 }]);
  });
});

describe('groupBisSlots', () => {
  it('range les emplacements par groupe et complète les absents', () => {
    const groups = groupBisSlots([
      slot({ slot: 'ranged', source: 'curated', items: [{ itemId: 9, note: null }] }),
      slot({ slot: 'head' }),
      slot({ slot: 'unknown' }),
    ]);
    expect(groups.map((g) => g.id)).toEqual(['armor', 'accessories', 'weapons']);
    expect(groups.flatMap((g) => g.slots).map((s) => s.slot)).toHaveLength(18);
    expect(groups[0].slots[0].slot).toBe('head');
    expect(groups[2].slots[3]).toMatchObject({ slot: 'ranged', items: [{ itemId: 9 }] });
    expect(groups[1].slots[0]).toEqual(slot({ slot: 'neck' }));
  });

  it('rend les 18 emplacements vides sans réponse', () => {
    expect(groupBisSlots(undefined).flatMap((g) => g.slots)).toHaveLength(18);
  });
});

describe('hasAnyBisItem', () => {
  it('dit si au moins un emplacement a un objet', () => {
    expect(hasAnyBisItem(undefined)).toBe(false);
    expect(hasAnyBisItem([slot({ slot: 'head' })])).toBe(false);
    expect(hasAnyBisItem([slot({ slot: 'head', items: [{ itemId: 1, note: null }] })])).toBe(true);
  });
});

describe('getBisOrigins', () => {
  const items = [{ itemId: 1, note: null }];

  it('donne l’origine de la liste retenue', () => {
    expect(
      getBisOrigins(slot({ slot: 'head', source: 'guild', season: 'tier-1', items }), 'tier-1'),
    ).toEqual(['guild']);
    expect(
      getBisOrigins(slot({ slot: 'head', source: 'curated', season: 'tier-1', items }), 'tier-1'),
    ).toEqual(['curated']);
  });

  it('signale une liste héritée d’un palier antérieur', () => {
    expect(
      getBisOrigins(slot({ slot: 'head', source: 'guild', season: 'tier-1', items }), 'tier-2'),
    ).toEqual(['guild', 'previousTier']);
  });

  it('ne donne rien pour un emplacement vide', () => {
    expect(getBisOrigins(slot({ slot: 'head' }), 'tier-1')).toEqual([]);
  });
});

describe('resolveBisSpecId', () => {
  const forever = [71, 72, 73];

  it('préfère la spé de l’URL quand elle existe dans Forever', () => {
    expect(resolveBisSpecId('72', 71, forever)).toBe(72);
  });

  it('retombe sur la spé du personnage si elle est jouable dans Forever', () => {
    expect(resolveBisSpecId('999', 73, forever)).toBe(73);
    expect(resolveBisSpecId(null, 71, forever)).toBe(71);
  });

  it('ne choisit rien sinon', () => {
    expect(resolveBisSpecId(null, 250, forever)).toBeNull();
    expect(resolveBisSpecId(null, undefined, forever)).toBeNull();
    expect(resolveBisSpecId('abc', null, [])).toBeNull();
  });
});
