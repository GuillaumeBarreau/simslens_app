const {
  DEFAULT_HEALER_RATIO,
  DEFAULT_WEIGHTS,
  MAX_HISTORY_WEEKS,
} = require('../composition.constants');
const {
  MAX_HEALER_RATIO,
  clamp01,
  normalizeCompositionOptions,
  normalizeHistoryWeeks,
} = require('../composition.options');

describe('clamp01', () => {
  it.each([
    [0.5, 0.5],
    [2, 1],
    [-1, 0],
    [0, 0],
    [1, 1],
  ])('clamps %s to %s', (input, expected) => {
    expect(clamp01(input, 0.9)).toBe(expected);
  });

  it.each([undefined, null, 'x', NaN, Infinity])('falls back for %s', (input) => {
    expect(clamp01(input, 0.9)).toBe(0.9);
  });
});

describe('normalizeCompositionOptions', () => {
  it('returns the defaults for an empty body', () => {
    const options = normalizeCompositionOptions({});
    expect(options.weights).toEqual(DEFAULT_WEIGHTS);
    expect(options.healerRatio).toBe(DEFAULT_HEALER_RATIO);
    expect(options.historyWeeks).toBe(MAX_HISTORY_WEEKS);
    expect(options.selectedBossIds).toBeNull();
    expect(options.minBossesPerPlayer).toBe(0);
    expect(options.context).toBeNull();
  });

  it('tolerates a missing body', () => {
    expect(normalizeCompositionOptions().weights).toEqual(DEFAULT_WEIGHTS);
  });

  it('clamps the weights into [0,1] rather than rejecting them', () => {
    const { weights } = normalizeCompositionOptions({
      weights: { buffs: 2, upgrades: -1, history: 0.3 },
    });
    expect(weights).toEqual({ buffs: 1, upgrades: 0, history: 0.3 });
  });

  it('caps the healer ratio', () => {
    expect(normalizeCompositionOptions({ healerRatio: 0.9 }).healerRatio).toBe(MAX_HEALER_RATIO);
    expect(normalizeCompositionOptions({ healerRatio: -1 }).healerRatio).toBe(0);
  });

  it('clamps and floors historyWeeks', () => {
    expect(normalizeCompositionOptions({ historyWeeks: 0 }).historyWeeks).toBe(1);
    expect(normalizeCompositionOptions({ historyWeeks: 99 }).historyWeeks).toBe(MAX_HISTORY_WEEKS);
    expect(normalizeCompositionOptions({ historyWeeks: 3.7 }).historyWeeks).toBe(3);
  });

  it('ignores a historyWeeks that is not a number', () => {
    expect(normalizeCompositionOptions({ historyWeeks: '4' }).historyWeeks).toBe(MAX_HISTORY_WEEKS);
  });

  it('leaves sizeOverride unbounded, the cap being applied by the service', () => {
    expect(normalizeCompositionOptions({ sizeOverride: 99 }).sizeOverride).toBe(99);
  });

  it('ignores a non-numeric sizeOverride', () => {
    expect(normalizeCompositionOptions({ sizeOverride: '20' }).sizeOverride).toBeUndefined();
  });

  it('keeps only the positive integer boss ids', () => {
    expect(
      normalizeCompositionOptions({ selectedBossIds: ['1', 'x', -2, '3'] }).selectedBossIds,
    ).toEqual([1, 3]);
  });

  it('returns null when selectedBossIds is not an array', () => {
    expect(normalizeCompositionOptions({ selectedBossIds: 'nope' }).selectedBossIds).toBeNull();
  });

  it('floors minBossesPerPlayer at zero', () => {
    expect(normalizeCompositionOptions({ minBossesPerPlayer: -5 }).minBossesPerPlayer).toBe(0);
    expect(normalizeCompositionOptions({ minBossesPerPlayer: 2.9 }).minBossesPerPlayer).toBe(2);
  });

  it('keeps a context only when its schema version is supported', () => {
    expect(normalizeCompositionOptions({ context: { schemaVersion: 1, a: 1 } }).context).toEqual({
      schemaVersion: 1,
      a: 1,
    });
    expect(normalizeCompositionOptions({ context: { schemaVersion: 2 } }).context).toBeNull();
  });
});

describe('normalizeHistoryWeeks', () => {
  it.each([
    ['1', 1],
    ['0', 1],
    ['99', MAX_HISTORY_WEEKS],
    ['3', 3],
    [2, 2],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizeHistoryWeeks(input)).toBe(expected);
  });

  it.each([undefined, null, 'x'])('falls back to the maximum for %s', (input) => {
    expect(normalizeHistoryWeeks(input)).toBe(MAX_HISTORY_WEEKS);
  });
});
