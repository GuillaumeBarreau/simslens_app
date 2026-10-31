import { DEFAULT_LOG_LIMIT, MAX_LOG_LIMIT, resolveLimit } from '../activity_log.constants';

describe('resolveLimit', () => {
  it('falls back to the default when no limit is given', () => {
    expect(resolveLimit(undefined)).toBe(DEFAULT_LOG_LIMIT);
  });

  it('falls back to the default for a non-numeric limit', () => {
    expect(resolveLimit(NaN)).toBe(DEFAULT_LOG_LIMIT);
    expect(resolveLimit(null)).toBe(DEFAULT_LOG_LIMIT);
  });

  it('falls back to the default for a zero or negative limit', () => {
    expect(resolveLimit(0)).toBe(DEFAULT_LOG_LIMIT);
    expect(resolveLimit(-10)).toBe(DEFAULT_LOG_LIMIT);
  });

  it('keeps a limit inside the allowed range', () => {
    expect(resolveLimit(25)).toBe(25);
  });

  it('caps a limit above the maximum', () => {
    expect(resolveLimit(10000)).toBe(MAX_LOG_LIMIT);
  });

  it('keeps the maximum itself', () => {
    expect(resolveLimit(MAX_LOG_LIMIT)).toBe(MAX_LOG_LIMIT);
  });
});
