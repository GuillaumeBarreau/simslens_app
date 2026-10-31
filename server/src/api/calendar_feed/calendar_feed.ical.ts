/**
 * Génération minimale d'un calendrier iCalendar (RFC 5545), sans dépendance.
 *
 * Seul ce dont le flux des soirées a besoin est couvert : un VCALENDAR de
 * VEVENT aux heures UTC. Fonctions pures, testées sans base.
 */

/** Fin de ligne imposée par la RFC 5545 (§3.1). */
const CRLF = '\r\n';

/** Longueur maximale d'une ligne, en octets, hors CRLF (§3.1). */
const MAX_LINE_OCTETS = 75;

export type ICalEventStatus = 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';

export interface ICalEvent {
  /** Identifiant stable : le client remplace l'événement au lieu de le dupliquer. */
  uid: string;
  start: Date;
  end?: Date | null;
  /** Date de génération de l'occurrence (DTSTAMP, obligatoire). */
  stamp: Date;
  summary: string;
  description?: string | null;
  status?: ICalEventStatus;
  /** Dernière modification (LAST-MODIFIED) : aide le client à détecter un changement. */
  lastModified?: Date | null;
  /** Révision (SEQUENCE), croissante à chaque modification. */
  sequence?: number | null;
}

export interface ICalCalendar {
  /** Nom affiché par le client (X-WR-CALNAME). */
  name: string;
  events: ICalEvent[];
}

/** Caractère de contrôle interdit dans une valeur TEXT (§3.3.11) : tous sauf tabulation et fins de ligne. */
function isForbiddenControl(char: string): boolean {
  const code = char.charCodeAt(0);
  if (char === '\t' || char === '\n' || char === '\r') return false;
  return code < 0x20 || code === 0x7f;
}

/**
 * Échappe une valeur de type TEXT (§3.3.11) : retire les caractères de
 * contrôle, puis échappe antislash, point-virgule, virgule et retours à la
 * ligne.
 */
export function escapeText(value: string): string {
  return Array.from(value)
    .filter((char) => !isForbiddenControl(char))
    .join('')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Plie une ligne de contenu à 75 octets (§3.1) : chaque suite commence par
 * CRLF puis une espace, qui compte dans les 75 octets. Le découpage se fait
 * entre deux caractères, jamais au milieu d'un caractère UTF-8 multioctet.
 */
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= MAX_LINE_OCTETS) return line;

  const segments: string[] = [];
  let current = '';
  let currentOctets = 0;
  // La première ligne a 75 octets, les suivantes 74 (l'espace de tête compte).
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const octets = Buffer.byteLength(char, 'utf8');
    if (currentOctets + octets > limit) {
      segments.push(current);
      current = '';
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    currentOctets += octets;
  }
  segments.push(current);

  return segments.join(`${CRLF} `);
}

/** Date-heure UTC au format iCalendar (§3.3.5, forme 2) : 20260202T200000Z. */
export function formatUtcDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

function eventLines(event: ICalEvent): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtcDateTime(event.stamp)}`,
    `DTSTART:${formatUtcDateTime(event.start)}`,
  ];
  // Une fin absente ou antérieure au début rendrait l'événement invalide :
  // sans DTEND, il dure zéro minute (§3.6.1), ce que tous les clients acceptent.
  if (event.end && event.end.getTime() > event.start.getTime()) {
    lines.push(`DTEND:${formatUtcDateTime(event.end)}`);
  }
  lines.push(`SUMMARY:${escapeText(event.summary)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.status) lines.push(`STATUS:${event.status}`);
  if (event.lastModified) lines.push(`LAST-MODIFIED:${formatUtcDateTime(event.lastModified)}`);
  if (event.sequence !== undefined && event.sequence !== null) {
    lines.push(`SEQUENCE:${Math.max(0, Math.floor(event.sequence))}`);
  }
  lines.push('END:VEVENT');

  return lines;
}

/** Document iCalendar complet, lignes pliées et terminées par CRLF. */
export function buildCalendar(calendar: ICalCalendar): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Droptimizer//Calendrier des raids//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendar.name)}`,
    // Indication de rafraîchissement, respectée par Apple et Outlook.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...calendar.events.flatMap(eventLines),
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join(CRLF) + CRLF;
}
