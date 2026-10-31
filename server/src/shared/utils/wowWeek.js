/**
 * Weekly tracking reset utility.
 *
 * The guild's tracking week resets every Wednesday at 05:00 Europe/Paris
 * (DST-aware — the wall-clock boundary stays at 05:00 year-round).
 *
 * The `region` param is kept for API compatibility with existing callers
 * but is ignored: the reset is now unified on Paris time.
 */

const PARIS_TZ = 'Europe/Paris';
const RESET_HOUR = 5;
const RESET_DOW = 3;

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * @param {Date} date
 */
function parisParts(date) {
  const raw = new Intl.DateTimeFormat('en-US', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);

  const o = {};
  for (const p of raw) {
    if (p.type !== 'literal') o[p.type] = p.value;
  }
  return {
    year: Number(o.year),
    month: Number(o.month),
    day: Number(o.day),
    hour: o.hour === '24' ? 0 : Number(o.hour),
    minute: Number(o.minute),
    dow: WEEKDAY_INDEX[o.weekday],
  };
}

/**
 * Convert a Paris wall-clock (Y, M, D, H:00) into the matching UTC Date.
 * Safe at 05:00 — that hour is never skipped or duplicated by DST transitions.
 */
function parisWallClockToUtc(year, month, day, hour) {
  // First try CET (+1): UTC = local - 1h
  const candidate = new Date(Date.UTC(year, month - 1, day, hour - 1, 0, 0));
  const check = parisParts(candidate);
  if (check.hour === hour && check.day === day) return candidate;
  // Otherwise it's CEST (+2): step back one more hour
  return new Date(Date.UTC(year, month - 1, day, hour - 2, 0, 0));
}

/**
 * Returns the start of the current tracking week:
 * the most recent Wednesday at 05:00 Europe/Paris.
 * @returns {Date}
 */
function getWowWeekStart() {
  return getWowWeekStartFor(new Date());
}

/**
 * Returns the start of the tracking week containing `ref`:
 * the most recent Wednesday at 05:00 Europe/Paris at or before `ref`.
 * @param {Date} ref
 * @returns {Date}
 */
function getWowWeekStartFor(ref) {
  for (let i = 0; i < 8; i++) {
    const probe = new Date(ref.getTime() - i * 86400000);
    const p = parisParts(probe);
    if (p.dow !== RESET_DOW) continue;
    const boundary = parisWallClockToUtc(p.year, p.month, p.day, RESET_HOUR);
    if (boundary <= ref) return boundary;
  }
  throw new Error('Unable to compute week start');
}

/**
 * Lists all week-start boundaries (Wed 05:00 Europe/Paris) from the week
 * containing `sinceDate` up through the current week, in chronological order.
 * @param {Date} sinceDate
 * @returns {Date[]}
 */
function listWowWeekStarts(sinceDate) {
  const first = getWowWeekStartFor(sinceDate);
  const current = getWowWeekStart();
  const out = [];
  let cursor = first;
  for (let i = 0; i < 600 && cursor <= current; i++) {
    out.push(cursor);
    const next = new Date(cursor.getTime() + 7 * 86400000 + 3 * 3600000);
    cursor = getWowWeekStartFor(next);
  }
  return out;
}

module.exports = { getWowWeekStart, getWowWeekStartFor, listWowWeekStarts };
