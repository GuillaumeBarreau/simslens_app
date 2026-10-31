import { RANK1_GEMS, RANK2_GEMS } from '../enchantments.constants';
import {
  parseEnchantIdFromEncoded,
  parseGemIdsFromEncoded,
  worstGemRank,
} from '../enchantments.parsing';

const [rank1Gem] = [...RANK1_GEMS];
const [rank2Gem, otherRank2Gem] = [...RANK2_GEMS];
const UNKNOWN_GEM = 999_999;

describe('parseEnchantIdFromEncoded', () => {
  it('reads the enchant id out of a SimC item string', () => {
    expect(parseEnchantIdFromEncoded('head=,id=212068,enchant_id=7935')).toBe(7935);
  });

  it('returns null when the item carries no enchant', () => {
    expect(parseEnchantIdFromEncoded('head=,id=212068')).toBeNull();
  });

  it.each([null, undefined, ''])('returns null for %s', (input: string | null | undefined) => {
    expect(parseEnchantIdFromEncoded(input)).toBeNull();
  });
});

describe('parseGemIdsFromEncoded', () => {
  it('reads a single gem', () => {
    expect(parseGemIdsFromEncoded('neck=,id=1,gem_id=213743')).toEqual([213743]);
  });

  it('reads several gems separated by slashes', () => {
    expect(parseGemIdsFromEncoded('neck=,id=1,gem_id=213743/213458')).toEqual([213743, 213458]);
  });

  it('returns an empty list when the item carries no gem', () => {
    expect(parseGemIdsFromEncoded('neck=,id=1')).toEqual([]);
  });

  it.each([null, undefined, ''])(
    'returns an empty list for %s',
    (input: string | null | undefined) => {
      expect(parseGemIdsFromEncoded(input)).toEqual([]);
    },
  );

  it('drops a zero id rather than keeping an empty socket', () => {
    expect(parseGemIdsFromEncoded('neck=,id=1,gem_id=0/213458')).toEqual([213458]);
  });
});

describe('worstGemRank', () => {
  it('reports a missing gem', () => {
    expect(worstGemRank([])).toEqual({ isValid: false, reason: 'missing', rank: null });
  });

  it('accepts a rank 2 gem', () => {
    expect(worstGemRank([rank2Gem])).toEqual({ isValid: true, reason: 'valid', rank: 2 });
  });

  it('accepts a rank 1 gem, reporting its rank', () => {
    expect(worstGemRank([rank1Gem])).toEqual({ isValid: true, reason: 'valid', rank: 1 });
  });

  it('keeps the weakest rank when gems differ', () => {
    expect(worstGemRank([rank2Gem, rank1Gem]).rank).toBe(1);
  });

  it('keeps rank 2 when every gem is rank 2', () => {
    expect(worstGemRank([rank2Gem, otherRank2Gem]).rank).toBe(2);
  });

  it('rejects the whole slot on a single unknown gem', () => {
    expect(worstGemRank([rank2Gem, UNKNOWN_GEM])).toEqual({
      isValid: false,
      reason: 'invalid',
      rank: null,
    });
  });
});
