import {
  formatUserCode,
  generateAccessToken,
  generateDeviceCode,
  generateUserCode,
  normalizeUserCode,
  USER_CODE_ALPHABET,
  USER_CODE_LENGTH,
} from '../device_auth.codes';

describe('generateUserCode', () => {
  it('has the expected length', () => {
    expect(generateUserCode()).toHaveLength(USER_CODE_LENGTH);
  });

  it('only draws from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      for (const char of generateUserCode()) {
        expect(USER_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it.each(['I', 'O', '0', '1'])('never produces the ambiguous character %s', (char: string) => {
    const drawn = Array.from({ length: 200 }, () => generateUserCode()).join('');
    expect(drawn).not.toContain(char);
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateUserCode()));
    expect(codes.size).toBe(50);
  });
});

describe('generateDeviceCode / generateAccessToken', () => {
  it('produces 64 hex characters', () => {
    expect(generateDeviceCode()).toMatch(/^[0-9a-f]{64}$/);
    expect(generateAccessToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not repeat itself', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateAccessToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('formatUserCode', () => {
  it('splits the code into two groups of four', () => {
    expect(formatUserCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('leaves a code of unexpected length untouched', () => {
    expect(formatUserCode('ABC')).toBe('ABC');
  });

  it('tolerates an empty value', () => {
    expect(formatUserCode('')).toBe('');
  });
});

describe('normalizeUserCode', () => {
  it.each([
    ['abcd-efgh', 'ABCDEFGH'],
    ['ABCD EFGH', 'ABCDEFGH'],
    ['  abcdefgh  ', 'ABCDEFGH'],
    ['ABCD--EFGH', 'ABCDEFGH'],
  ])('normalises %s to %s', (input: string, expected: string) => {
    expect(normalizeUserCode(input)).toBe(expected);
  });

  it.each([null, undefined, ''])('turns %s into an empty string', (input: unknown) => {
    expect(normalizeUserCode(input)).toBe('');
  });
});
