import { DEFAULT_RANGE_DAYS, MAX_RANGE_DAYS, resolveDateRange } from '../attendance.dateRange';
import {
  DateRangeTooLargeError,
  InvalidDateError,
  InvalidDateOrderError,
} from '../attendance.errors';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

describe('resolveDateRange', () => {
  it('falls back to the last thirty days when nothing is given', () => {
    const { startDate, endDate } = resolveDateRange(null, null);
    const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
    expect(spanDays).toBe(DEFAULT_RANGE_DAYS);
  });

  it('keeps explicit bounds', () => {
    const { startDate, endDate } = resolveDateRange('2026-01-01', '2026-01-31');
    expect(startDate.toISOString()).toContain('2026-01-01');
    expect(endDate.toISOString()).toContain('2026-01-31');
  });

  it('accepts Date instances as well as strings', () => {
    const start = new Date('2026-01-01');
    expect(resolveDateRange(start, new Date('2026-01-02')).startDate).toEqual(start);
  });

  it.each(['pas-une-date', '2026-13-45'])('rejects the unparsable date %s', (value: string) => {
    expect(() => resolveDateRange(value, null)).toThrow(InvalidDateError);
  });

  it('rejects bounds given in the wrong order', () => {
    expect(() => resolveDateRange('2026-02-01', '2026-01-01')).toThrow(InvalidDateOrderError);
  });

  it('accepts a range of a single instant', () => {
    expect(() => resolveDateRange('2026-01-01', '2026-01-01')).not.toThrow();
  });

  it('leaves a long range alone when the span is not enforced', () => {
    expect(() => resolveDateRange('2020-01-01', '2026-01-01')).not.toThrow();
  });

  it('rejects a range beyond the maximum span when enforced', () => {
    expect(() => resolveDateRange('2020-01-01', '2026-01-01', { enforceMaxSpan: true })).toThrow(
      DateRangeTooLargeError,
    );
  });

  it('accepts a range exactly at the maximum span', () => {
    const start = new Date('2026-01-01');
    const end = new Date(start.getTime() + MAX_RANGE_DAYS * MS_PER_DAY);
    expect(() => resolveDateRange(start, end, { enforceMaxSpan: true })).not.toThrow();
  });

  it('carries the limit in the error message', () => {
    expect(() => resolveDateRange('2020-01-01', '2026-01-01', { enforceMaxSpan: true })).toThrow(
      `Date range too large (max ${MAX_RANGE_DAYS} days)`,
    );
  });
});
