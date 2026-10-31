import {
  buildConfirmReminder,
  confirmReminderHeadline,
  formatTimeUntil,
  isConfirmReminderDue,
  mayHaveBeenSent,
  type ReminderSignup,
} from '../confirmReminder';

vi.mock('../../data', () => ({ prisma: {} }));

const HOUR = 3600 * 1000;
const start = new Date('2026-10-10T21:00:00Z');

describe('isConfirmReminderDue', () => {
  it('is due once the window has opened', () => {
    expect(isConfirmReminderDue(start, 2, new Date(start.getTime() - 2 * HOUR))).toBe(true);
    expect(isConfirmReminderDue(start, 2, new Date(start.getTime() - HOUR))).toBe(true);
  });

  it('is not due before the window', () => {
    expect(isConfirmReminderDue(start, 2, new Date(start.getTime() - 2 * HOUR - 1))).toBe(false);
  });

  it('is not due once the raid has started', () => {
    expect(isConfirmReminderDue(start, 2, start)).toBe(false);
  });

  it.each([0, -1, Number.NaN])('is disabled for %s hours', (hours) => {
    expect(isConfirmReminderDue(start, hours, new Date(start.getTime() - HOUR))).toBe(false);
  });
});

describe('formatTimeUntil', () => {
  it.each([
    [2 * HOUR, '2 h'],
    [90 * 60_000, '1 h 30'],
    [65 * 60_000, '1 h 05'],
    [45 * 60_000, '45 min'],
    [-HOUR, '0 min'],
  ])('formats %s ms as %s', (delta, expected) => {
    expect(formatTimeUntil(new Date(start.getTime() + delta), start)).toBe(expected);
  });
});

describe('confirmReminderHeadline (SIMS-204)', () => {
  const raidStart = new Date('2026-02-02T20:00:00Z');
  const now = new Date('2026-02-02T18:00:00Z');

  it('gives the time left and the start time in the realm time zone', () => {
    expect(confirmReminderHeadline('Manaforge', raidStart, now, 'Europe/Paris')).toBe(
      '⏰ **Manaforge commence dans 2 h (21:00) !** Voici la composition annoncée.',
    );
    expect(confirmReminderHeadline('Manaforge', raidStart, now, 'America/New_York')).toContain(
      '(15:00)',
    );
  });

  it('falls back to the default time zone', () => {
    expect(confirmReminderHeadline('Manaforge', raidStart, now, undefined)).toContain('(21:00)');
  });
});

describe('mayHaveBeenSent', () => {
  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'])(
    'is true for an interrupted call (%s)',
    (code) => {
      expect(mayHaveBeenSent({ code })).toBe(true);
    },
  );

  it('is false when the bot answered or was unreachable', () => {
    expect(mayHaveBeenSent({ response: { status: 500 } })).toBe(false);
    expect(mayHaveBeenSent({ code: 'ECONNREFUSED' })).toBe(false);
    expect(mayHaveBeenSent({ message: 'db down' })).toBe(false);
  });
});

function signup(
  status: string,
  name: string,
  opts: { role?: string; spec?: string; specRole?: string; tag?: string; cls?: string } = {},
): ReminderSignup {
  return {
    status,
    role: opts.role ?? null,
    character: {
      name,
      class: opts.cls ?? 'Warrior',
      discordTag: opts.tag ?? `${name}#1`,
      specialization: opts.spec ? { name: opts.spec, role: opts.specRole ?? null } : null,
    },
  };
}

describe('buildConfirmReminder', () => {
  it('places a DPS signup with a tank main spec in melee', () => {
    const { composition } = buildConfirmReminder([
      signup('PRESENT', 'OffTank', { role: 'DPS', spec: 'Protection', specRole: 'TANK' }),
    ]);

    expect(composition.tanks).toEqual([]);
    expect(composition.melee.map((e) => e.name)).toEqual(['OffTank']);
  });

  it('groups starters by role, melee and ranged by spec', () => {
    const { composition } = buildConfirmReminder([
      signup('PRESENT', 'Tank', { role: 'TANK' }),
      signup('PRESENT', 'Heal', { spec: 'Holy', specRole: 'HEALER' }),
      signup('LATE', 'Fury', { role: 'DPS', spec: 'Fury' }),
      signup('PRESENT', 'Mage', { spec: 'Fire', specRole: 'DPS' }),
      signup('PRESENT', 'Explicit', { role: 'MELEE' }),
      signup('PRESENT', 'FrostMage', { role: 'DPS', spec: 'Frost', cls: 'Mage' }),
      signup('PRESENT', 'FrostDk', { role: 'DPS', spec: 'Frost', cls: 'Death Knight' }),
    ]);

    expect(composition.tanks.map((e) => e.name)).toEqual(['Tank']);
    expect(composition.healers.map((e) => e.name)).toEqual(['Heal']);
    expect(composition.melee.map((e) => e.name)).toEqual(['Fury', 'Explicit', 'FrostDk']);
    expect(composition.ranged.map((e) => e.name)).toEqual(['Mage', 'FrostMage']);
  });

  it('reads classes as stored in the database (snake_case)', () => {
    const { composition } = buildConfirmReminder([
      signup('PRESENT', 'FrostMage', { role: 'DPS', spec: 'Frost', cls: 'mage' }),
      signup('PRESENT', 'FrostDk', { role: 'DPS', spec: 'Frost', cls: 'death_knight' }),
      signup('PRESENT', 'Devourer', { spec: 'Devourer', specRole: 'ranged', cls: 'demon_hunter' }),
      signup('PRESENT', 'Vengeance', { spec: 'Vengeance', specRole: 'tank', cls: 'demon_hunter' }),
      signup('PRESENT', 'Aug', { spec: 'Augmentation', specRole: 'dps', cls: 'evoker' }),
    ]);

    expect(composition.tanks.map((e) => e.name)).toEqual(['Vengeance']);
    expect(composition.melee.map((e) => e.name)).toEqual(['FrostDk']);
    expect(composition.ranged.map((e) => e.name)).toEqual(['FrostMage', 'Devourer', 'Aug']);
  });

  it('lists tentative signups apart and mentions them with the starters', () => {
    const result = buildConfirmReminder([
      signup('PRESENT', 'Starter', { role: 'TANK' }),
      signup('TENTATIVE', 'Maybe', { role: 'HEALER' }),
    ]);

    expect(result.composition.healers).toEqual([]);
    expect(result.tentative).toEqual([{ name: 'Maybe', class: 'Warrior' }]);
    expect(result.players).toEqual([
      { name: 'Starter', discordTag: 'Starter#1' },
      { name: 'Maybe', discordTag: 'Maybe#1' },
    ]);
  });

  it('shows the arrival time of late starters', () => {
    const { composition } = buildConfirmReminder([
      { ...signup('LATE', 'Late', { role: 'TANK' }), lateTime: '21:30' },
      signup('LATE', 'Unknown time', { role: 'TANK' }),
    ]);

    expect(composition.tanks).toEqual([
      { name: 'Late', class: 'Warrior', lateTime: '21:30' },
      { name: 'Unknown time', class: 'Warrior', lateTime: '?' },
    ]);
  });

  it('ignores bench and absent signups', () => {
    const result = buildConfirmReminder([
      signup('BENCH', 'Bench', { role: 'TANK' }),
      signup('ABSENT', 'Away', { role: 'TANK' }),
    ]);

    expect(result.composition.tanks).toEqual([]);
    expect(result.tentative).toEqual([]);
    expect(result.players).toEqual([]);
  });

  it('keeps a starter without Discord tag in the composition but does not mention them', () => {
    const result = buildConfirmReminder([signup('PRESENT', 'NoTag', { role: 'TANK', tag: '' })]);

    expect(result.composition.tanks.map((e) => e.name)).toEqual(['NoTag']);
    expect(result.players).toEqual([]);
  });
});
