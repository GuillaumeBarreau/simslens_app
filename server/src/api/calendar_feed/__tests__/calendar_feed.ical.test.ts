// Génération iCalendar (RFC 5545) du flux des soirées (SIMS-204).
import {
  buildCalendar,
  escapeText,
  foldLine,
  formatUtcDateTime,
  type ICalEvent,
} from '../calendar_feed.ical';

const octets = (s: string) => Buffer.byteLength(s, 'utf8');

const event = (overrides: Partial<ICalEvent> = {}): ICalEvent => ({
  uid: 'raid-event-7@droptimizer',
  start: new Date('2026-02-02T20:00:00Z'),
  end: new Date('2026-02-02T23:00:00Z'),
  stamp: new Date('2026-01-30T10:15:30.123Z'),
  summary: 'Manaforge',
  ...overrides,
});

describe('escapeText', () => {
  it('escapes backslashes, semicolons and commas', () => {
    expect(escapeText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d');
  });

  it.each(['\n', '\r\n', '\r'])('turns the line break %j into \\n', (br) => {
    expect(escapeText(`one${br}two`)).toBe('one\\ntwo');
  });

  it('escapes the backslash before adding its own', () => {
    expect(escapeText('x\n')).toBe('x\\n');
    expect(escapeText('x\\n')).toBe('x\\\\n');
  });

  it('removes control characters but keeps tabs and line breaks', () => {
    const value = `a${String.fromCharCode(0)}b${String.fromCharCode(7)}c${String.fromCharCode(0x1b)}d${String.fromCharCode(0x7f)}e\tf\ng`;
    expect(escapeText(value)).toBe('abcde\tf\\ng');
  });

  it('leaves colons and accents untouched', () => {
    expect(escapeText('Guilde : Présent')).toBe('Guilde : Présent');
  });
});

describe('foldLine', () => {
  it('keeps a line of 75 octets as is', () => {
    const line = 'A'.repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it('folds a longer line with CRLF and a space, 75 octets per physical line', () => {
    const line = `SUMMARY:${'x'.repeat(200)}`;
    const folded = foldLine(line);
    const physical = folded.split('\r\n');

    expect(physical.length).toBeGreaterThan(1);
    physical.slice(1).forEach((l) => expect(l.startsWith(' ')).toBe(true));
    physical.forEach((l) => expect(octets(l)).toBeLessThanOrEqual(75));
    // Déplier (retirer CRLF + espace) redonne la ligne d'origine.
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('never splits a multibyte character', () => {
    const line = `SUMMARY:${'é'.repeat(100)}`;
    const physical = foldLine(line).split('\r\n');

    physical.forEach((l) => {
      expect(octets(l)).toBeLessThanOrEqual(75);
      expect(l).not.toContain('�');
    });
    expect(
      physical
        .map((l, i) => (i === 0 ? l : l.slice(1)))
        .join('')
        .normalize(),
    ).toBe(line);
  });

  it('counts emoji (4 octets) as one character', () => {
    const line = `SUMMARY:${'🎉'.repeat(40)}`;
    const physical = foldLine(line).split('\r\n');
    physical.forEach((l) => expect(octets(l)).toBeLessThanOrEqual(75));
    expect(foldLine(line).replace(/\r\n /g, '')).toBe(line);
  });
});

describe('formatUtcDateTime', () => {
  it('formats in UTC without separators nor milliseconds', () => {
    expect(formatUtcDateTime(new Date('2026-02-02T20:05:09.987Z'))).toBe('20260202T200509Z');
  });

  it('converts an offset date to UTC', () => {
    expect(formatUtcDateTime(new Date('2026-07-14T21:00:00+02:00'))).toBe('20260714T190000Z');
  });
});

describe('buildCalendar', () => {
  it('produces a VCALENDAR with CRLF line endings', () => {
    const ics = buildCalendar({ name: 'Raids', events: [event()] });

    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics).toContain('PRODID:');
    expect(ics).toContain('X-WR-CALNAME:Raids\r\n');
  });

  it('writes the event times in UTC', () => {
    const ics = buildCalendar({ name: 'Raids', events: [event()] });

    expect(ics).toContain('\r\nBEGIN:VEVENT\r\nUID:raid-event-7@droptimizer\r\n');
    expect(ics).toContain('DTSTAMP:20260130T101530Z\r\n');
    expect(ics).toContain('DTSTART:20260202T200000Z\r\n');
    expect(ics).toContain('DTEND:20260202T230000Z\r\n');
  });

  it('escapes the summary and the description', () => {
    const ics = buildCalendar({
      name: 'Raids',
      events: [event({ summary: 'Raid; HM, NM', description: 'Ligne 1\nLigne 2' })],
    });

    expect(ics).toContain('SUMMARY:Raid\\; HM\\, NM\r\n');
    expect(ics).toContain('DESCRIPTION:Ligne 1\\nLigne 2\r\n');
  });

  it('omits DTEND when the end is not after the start', () => {
    const start = new Date('2026-02-02T20:00:00Z');
    const ics = buildCalendar({ name: 'Raids', events: [event({ start, end: start })] });

    expect(ics).not.toContain('DTEND');
  });

  it('writes LAST-MODIFIED in UTC and SEQUENCE when given', () => {
    const ics = buildCalendar({
      name: 'Raids',
      events: [event({ lastModified: new Date('2026-01-25T10:00:00.500Z'), sequence: 42 })],
    });

    expect(ics).toContain('LAST-MODIFIED:20260125T100000Z\r\n');
    expect(ics).toContain('SEQUENCE:42\r\n');
  });

  it('omits LAST-MODIFIED and SEQUENCE when absent', () => {
    const ics = buildCalendar({ name: 'Raids', events: [event()] });
    expect(ics).not.toContain('LAST-MODIFIED');
    expect(ics).not.toContain('SEQUENCE');
  });

  it('keeps the control characters out of the document', () => {
    const ics = buildCalendar({
      name: 'Raids',
      events: [event({ summary: `Raid${String.fromCharCode(0)}${String.fromCharCode(0x1b)}` })],
    });
    expect(ics).toContain('SUMMARY:Raid\r\n');
  });

  it('writes the status when given', () => {
    const ics = buildCalendar({ name: 'Raids', events: [event({ status: 'CANCELLED' })] });
    expect(ics).toContain('STATUS:CANCELLED\r\n');
  });

  it('folds long lines', () => {
    const ics = buildCalendar({
      name: 'Raids',
      events: [event({ description: 'mot '.repeat(60) })],
    });

    ics
      .split('\r\n')
      .forEach((line) => expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75));
  });

  it('accepts an empty calendar', () => {
    const ics = buildCalendar({ name: 'Raids', events: [] });
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
