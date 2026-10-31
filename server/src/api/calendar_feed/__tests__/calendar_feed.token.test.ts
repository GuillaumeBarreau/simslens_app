// Jeton du flux iCal : non devinable, stocké haché (SIMS-204).
import { generateFeedToken, hashFeedToken, tokenFromFileName } from '../calendar_feed.token';
import { calendarFeedFileParam } from '../calendar_feed.validation';

describe('generateFeedToken', () => {
  it('produces 256 random bits in base64url (43 URL-safe characters)', () => {
    const token = generateFeedToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateFeedToken));
    expect(tokens.size).toBe(200);
  });

  it('is accepted by the route schema, with or without .ics', () => {
    const token = generateFeedToken();
    expect(calendarFeedFileParam.validate({ file: token }).error).toBeUndefined();
    expect(calendarFeedFileParam.validate({ file: `${token}.ics` }).error).toBeUndefined();
  });
});

describe('calendarFeedFileParam', () => {
  it.each(['short', '../../etc/passwd', `${'a'.repeat(43)}.txt`, `${'a'.repeat(200)}`])(
    'refuses %s',
    (file) => {
      expect(calendarFeedFileParam.validate({ file }).error).toBeDefined();
    },
  );
});

describe('hashFeedToken', () => {
  it('is a deterministic SHA-256 that differs from the token', () => {
    const token = generateFeedToken();
    expect(hashFeedToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashFeedToken(token)).toBe(hashFeedToken(token));
    expect(hashFeedToken(token)).not.toContain(token);
  });

  it('differs between two tokens', () => {
    expect(hashFeedToken('a'.repeat(43))).not.toBe(hashFeedToken('b'.repeat(43)));
  });
});

describe('tokenFromFileName', () => {
  it('strips the .ics extension', () => {
    expect(tokenFromFileName('abc.ics')).toBe('abc');
  });

  it('keeps a bare token', () => {
    expect(tokenFromFileName('abc')).toBe('abc');
  });
});
