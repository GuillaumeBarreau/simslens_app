import { buildInviteLink, getInviteCodeStatus, splitInviteCodes, toInviteExpiryPayload } from '.';

const now = new Date('2026-10-11T12:00:00Z');
const code = (
  overrides: Partial<{ expiresAt: string | null; maxUses: number; useCount: number }>,
) => ({
  expiresAt: null,
  maxUses: 3,
  useCount: 0,
  ...overrides,
});

describe('getInviteCodeStatus', () => {
  it('is active without expiration while uses remain', () => {
    expect(getInviteCodeStatus(code({ useCount: 2 }), now)).toBe('active');
  });

  it('is exhausted once every use is consumed', () => {
    expect(getInviteCodeStatus(code({ useCount: 3 }), now)).toBe('exhausted');
  });

  it('is expired past its date, even with uses left', () => {
    expect(getInviteCodeStatus(code({ expiresAt: '2026-10-11T11:59:59Z' }), now)).toBe('expired');
  });

  it('stays active before its date', () => {
    expect(getInviteCodeStatus(code({ expiresAt: '2026-10-12T00:00:00Z' }), now)).toBe('active');
  });
});

describe('splitInviteCodes', () => {
  it('keeps the order and separates usable codes from the others', () => {
    const a = code({});
    const b = code({ useCount: 3 });
    const c = code({ expiresAt: '2026-10-01T00:00:00Z' });
    const d = code({ maxUses: 5 });
    expect(splitInviteCodes([a, b, c, d], now)).toEqual({ active: [a, d], inactive: [b, c] });
  });
});

describe('buildInviteLink', () => {
  it('points to the join page of the app', () => {
    expect(buildInviteLink('https://example.com/', 'K7QX2MRP9TWA')).toBe(
      'https://example.com/invite/K7QX2MRP9TWA',
    );
  });
});

describe('toInviteExpiryPayload', () => {
  it('sends nothing without a date', () => {
    expect(toInviteExpiryPayload(null)).toBeNull();
    expect(toInviteExpiryPayload('not-a-date')).toBeNull();
  });

  it('keeps the code valid until the end of the chosen local day', () => {
    const sent = new Date(toInviteExpiryPayload('2026-10-20') as string);
    expect([sent.getFullYear(), sent.getMonth(), sent.getDate()]).toEqual([2026, 9, 20]);
    expect([sent.getHours(), sent.getMinutes()]).toEqual([23, 59]);
  });
});
