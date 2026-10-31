import { OPTIONAL_GEM_SLOTS, RANK2_GEMS, VALID_ENCHANTMENTS } from '../enchantments.constants';
import { buildEnchantResults, buildGemResults, collectEnchantIds } from '../enchantments.results';
import type { EnchantmentMap, GearSnapshot, SnapshotItem } from '../enchantments.types';

const KNOWN_SPELL = VALID_ENCHANTMENTS.helm?.[0] ?? 1;
const [rank2Gem] = [...RANK2_GEMS];
const [optionalSlot] = [...OPTIONAL_GEM_SLOTS];

const item = (over: Partial<SnapshotItem> = {}): SnapshotItem => ({
  slot: 'head',
  enchantId: null,
  gemIds: null,
  encodedItem: null,
  ...over,
});

const snapshot = (items: SnapshotItem[], characterClass?: string): GearSnapshot => ({
  characterId: 1,
  items,
  character: characterClass ? { class: characterClass } : null,
});

const enchantMap = (over: Partial<EnchantmentMap[number]> = {}): EnchantmentMap => ({
  42: {
    id: 42,
    spellId: KNOWN_SPELL,
    displayName: 'Enchantement',
    craftingQuality: 3,
    ...over,
  },
});

describe('collectEnchantIds', () => {
  it('ignores slots that cannot be enchanted', () => {
    expect(collectEnchantIds(snapshot([item({ slot: 'neck', enchantId: 42 })]))).toEqual([]);
  });

  it('reads the id from the encoded string when the column is empty', () => {
    const s = snapshot([item({ encodedItem: 'head=,id=1,enchant_id=42' })]);
    expect(collectEnchantIds(s)).toEqual([42]);
  });

  it('prefers the column over the encoded string', () => {
    const s = snapshot([item({ enchantId: 7, encodedItem: 'head=,id=1,enchant_id=42' })]);
    expect(collectEnchantIds(s)).toEqual([7]);
  });

  it('removes duplicates', () => {
    const s = snapshot([item({ enchantId: 42 }), item({ slot: 'chest', enchantId: 42 })]);
    expect(collectEnchantIds(s)).toEqual([42]);
  });
});

describe('buildEnchantResults', () => {
  it('reports a missing enchant', () => {
    const [result] = buildEnchantResults(snapshot([item()]), {});
    expect(result).toMatchObject({ isValid: false, reason: 'missing' });
  });

  it('reports an enchant absent from the reference table', () => {
    const [result] = buildEnchantResults(snapshot([item({ enchantId: 999 })]), {});
    expect(result).toMatchObject({ isValid: false, reason: 'unknown', enchantId: 999 });
  });

  it('accepts a referenced enchant', () => {
    const [result] = buildEnchantResults(snapshot([item({ enchantId: 42 })]), enchantMap());
    expect(result).toMatchObject({ isValid: true, reason: 'valid' });
  });

  it('rejects an enchant outside the reference list', () => {
    const map = enchantMap({ spellId: 123_456 });
    const [result] = buildEnchantResults(snapshot([item({ enchantId: 42 })]), map);
    expect(result).toMatchObject({ isValid: false, reason: 'invalid' });
  });

  it('rejects an enchant carrying no spell id', () => {
    const map = enchantMap({ spellId: null });
    const [result] = buildEnchantResults(snapshot([item({ enchantId: 42 })]), map);
    expect(result).toMatchObject({ isValid: false, reason: 'invalid' });
  });

  it("accepts a death knight's weapon without checking, runeforging aside", () => {
    const s = snapshot([item({ slot: 'main_hand', enchantId: 42 })], 'death_knight');
    const map = enchantMap({ spellId: 123_456 });
    const [result] = buildEnchantResults(s, map);
    expect(result).toMatchObject({ isValid: true, reason: 'valid' });
  });

  it('still checks a death knight on other slots', () => {
    const s = snapshot([item({ slot: 'head', enchantId: 42 })], 'death_knight');
    const map = enchantMap({ spellId: 123_456 });
    expect(buildEnchantResults(s, map)[0]).toMatchObject({ isValid: false });
  });

  it('skips slots that cannot be enchanted', () => {
    expect(buildEnchantResults(snapshot([item({ slot: 'neck' })]), {})).toEqual([]);
  });
});

describe('buildGemResults', () => {
  it('accepts a socketed gem', () => {
    const s = snapshot([item({ slot: optionalSlot, gemIds: String(rank2Gem) })]);
    expect(buildGemResults(s).slots[0]).toMatchObject({ isValid: true, rank: 2 });
  });

  it('does not fault an optional slot left empty', () => {
    const s = snapshot([item({ slot: optionalSlot })]);
    expect(buildGemResults(s).slots[0]).toMatchObject({ isValid: null, reason: 'not_required' });
  });

  it('falls back to the encoded string when the column is empty', () => {
    const s = snapshot([item({ slot: optionalSlot, encodedItem: `x=,id=1,gem_id=${rank2Gem}` })]);
    expect(buildGemResults(s).slots[0].gemIds).toEqual([rank2Gem]);
  });

  it('reports no epic gem by default', () => {
    const s = snapshot([item({ slot: optionalSlot, gemIds: String(rank2Gem) })]);
    expect(buildGemResults(s).hasEpicGem).toBe(false);
  });

  it('ignores slots that take no gem', () => {
    expect(buildGemResults(snapshot([item({ slot: 'legs' })])).slots).toEqual([]);
  });
});
