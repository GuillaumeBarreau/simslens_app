import { describe, expect, it } from 'vitest';

const { strictId } = require('../strictId');

describe('strictId', () => {
  it.each([
    ['12', 12],
    [12, 12],
  ])('reads %j as %j', (value, expected) => {
    expect(strictId(value)).toBe(expected);
  });

  it.each([
    '1e1',
    '1.5e1',
    '12.0',
    ' 12',
    '012',
    '0',
    '-3',
    'abc',
    '',
    '9007199254740993',
    0,
    -1,
    1.5,
  ])('refuses %j', (value) => {
    expect(strictId(value)).toBeNaN();
  });

  it('refuses non-scalar values such as a repeated query parameter', () => {
    expect(strictId(['1', '2'])).toBeNaN();
    expect(strictId(undefined)).toBeNaN();
  });
});
