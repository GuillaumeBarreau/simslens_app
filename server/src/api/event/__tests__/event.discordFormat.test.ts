import {
  formatChannelName,
  formatEventDate,
  formatEventTitle,
  RAID_ACRONYMS,
} from '../event.discordFormat';

const event = (raidName: string, difficulty?: string, startTime = '2026-02-02T20:00:00') => ({
  startTime,
  raid_difficulty: { raid: { name: raidName }, difficulty },
});

describe('formatChannelName', () => {
  it('uses the configured acronym when there is one', () => {
    expect(formatChannelName(event('Manaforge Omega', 'Mythic'))).toBe('02-02-26-MFO-MYTHIC');
  });

  it('is case insensitive on the raid name', () => {
    expect(formatChannelName(event('MANAFORGE OMEGA', 'Mythic'))).toBe('02-02-26-MFO-MYTHIC');
  });

  it('falls back to the initials for an unlisted raid', () => {
    expect(formatChannelName(event('Nerub ar Palace', 'Heroic'))).toBe('02-02-26-NAP-HEROIC');
  });

  it('pads the day and the month', () => {
    expect(formatChannelName(event('X', 'M', '2026-03-05T20:00:00'))).toContain('05-03-26');
  });

  it('replaces the spaces of a two-word difficulty', () => {
    expect(formatChannelName(event('X', 'Raid Finder'))).toContain('RAID-FINDER');
  });

  it('tolerates an event without a raid', () => {
    expect(formatChannelName({ startTime: '2026-02-02T20:00:00' })).toBe('02-02-26-R-');
  });

  it.each(Object.entries(RAID_ACRONYMS))('maps %s to %s', (raidName: string, acronym: string) => {
    expect(formatChannelName(event(raidName, 'Mythic'))).toContain(`-${acronym}-`);
  });
});

describe('formatEventTitle', () => {
  it('appends the difficulty in brackets', () => {
    expect(formatEventTitle(event('Manaforge Omega', 'Mythic'))).toBe('Manaforge Omega (Mythic)');
  });

  it('omits the brackets when there is no difficulty', () => {
    expect(formatEventTitle(event('Manaforge Omega'))).toBe('Manaforge Omega');
  });

  it('falls back to a generic name', () => {
    expect(formatEventTitle({ startTime: '2026-02-02' })).toBe('Raid');
  });

  it('prefers the related difficulty name over the raw column', () => {
    const e = {
      startTime: '2026-02-02',
      raid_difficulty: {
        raid: { name: 'X' },
        difficulty: 'raw',
        difficulty_rel: { name: 'Mythique' },
      },
    };
    expect(formatEventTitle(e)).toBe('X (Mythique)');
  });
});

describe('formatEventDate', () => {
  it('returns both a short and a full form', () => {
    const { dateStr, startTime } = formatEventDate(event('X', 'M'));
    expect(dateStr).toContain('février');
    expect(startTime.length).toBeGreaterThan(dateStr.length);
  });
});

describe('fuseau du royaume (SIMS-204)', () => {
  // 23:30 UTC : déjà le lendemain à Paris, encore la veille à New York.
  const inZone = (timezone: string | null) => ({
    ...event('Manaforge Omega', 'Mythic', '2026-02-02T23:30:00Z'),
    realm: { timezone },
  });

  it('dates the channel in the realm time zone', () => {
    expect(formatChannelName(inZone('Europe/Paris'))).toBe('03-02-26-MFO-MYTHIC');
    expect(formatChannelName(inZone('America/New_York'))).toBe('02-02-26-MFO-MYTHIC');
  });

  it('formats the announced time in the realm time zone', () => {
    expect(formatEventDate(inZone('Europe/Paris'))).toEqual({
      dateStr: 'mardi 3 février',
      startTime: expect.stringContaining('00:30'),
    });
    expect(formatEventDate(inZone('America/New_York'))).toEqual({
      dateStr: 'lundi 2 février',
      startTime: expect.stringContaining('18:30'),
    });
  });

  it('falls back to the default time zone for an invalid one', () => {
    expect(formatEventDate(inZone('Mars/Olympus')).startTime).toContain('00:30');
  });
});
