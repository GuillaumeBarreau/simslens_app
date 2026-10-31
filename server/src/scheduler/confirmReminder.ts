/**
 * Second rappel de raid, peu avant le début (SIMS-143).
 *
 * `confirmReminderHours` avant le raid, le bot mentionne les titulaires et
 * les inscrits « tentative » et annonce la composition par rôle. Appelé à
 * chaque tick par le planificateur de `raidReminders.js`.
 */

import axios from 'axios';

import { prisma } from '../data';
import config from '../shared/config';
import { resolveSignupRole } from '../shared/constants/roles';
import { formatClockTime, resolveTimeZone } from '../shared/utils/timeZone';

/**
 * Délai maximal d'un appel au bot : un bot muet ne doit pas bloquer le tick.
 * Large, car le bot résout les mentions une par une avant de publier.
 */
const BOT_TIMEOUT_MS = 30_000;

/** Inscrits qui viennent au raid : ils forment la composition annoncée. */
export const STARTER_STATUSES = ['PRESENT', 'LATE'] as const;

/** Inscrits qui n'ont pas confirmé : ils sont mentionnés avec les titulaires. */
export const TENTATIVE_STATUS = 'TENTATIVE';

export interface ReminderSignup {
  status: string;
  role?: string | null;
  lateTime?: string | null;
  character?: {
    name?: string | null;
    class?: string | null;
    discordTag?: string | null;
    specialization?: { name?: string | null; role?: string | null } | null;
  } | null;
}

export interface CompositionEntry {
  name: string;
  class: string | null;
  /** Heure d'arrivée d'un retardataire, affichée par le bot comme dans le roster. */
  lateTime?: string;
}

export interface Composition {
  tanks: CompositionEntry[];
  healers: CompositionEntry[];
  melee: CompositionEntry[];
  ranged: CompositionEntry[];
}

export interface ConfirmReminder {
  composition: Composition;
  tentative: CompositionEntry[];
  players: Array<{ name: string; discordTag: string }>;
}

/**
 * Le rappel est dû dès `startTime - hours`, tant que le raid n'a pas commencé.
 * `hours <= 0` le désactive, comme pour le premier rappel.
 */
export function isConfirmReminderDue(startTime: Date, hours: number, now: Date): boolean {
  if (!Number.isFinite(hours) || hours <= 0) return false;
  if (now.getTime() >= startTime.getTime()) return false;

  return now.getTime() >= startTime.getTime() - hours * 3600 * 1000;
}

const COMPOSITION_KEY_BY_ROLE: Record<string, keyof Composition> = {
  TANK: 'tanks',
  HEALER: 'healers',
  MELEE: 'melee',
  RANGED: 'ranged',
};

/**
 * Rôle de raid d'un inscrit : celui de l'inscription, sinon celui de sa
 * spécialisation. Un DPS est placé en mêlée ou à distance selon sa classe et
 * sa spec (`resolveSignupRole` : un Mage Givre reste à distance, un DPS
 * d'appoint en spé tank joue au corps à corps).
 */
function raidRoleOf(signup: ReminderSignup): keyof Composition {
  return COMPOSITION_KEY_BY_ROLE[resolveSignupRole(signup.role, signup.character)];
}

function entryOf(signup: ReminderSignup): CompositionEntry {
  const entry: CompositionEntry = {
    name: signup.character?.name || 'Unknown',
    class: signup.character?.class || null,
  };
  if (signup.status === 'LATE') entry.lateTime = signup.lateTime || '?';

  return entry;
}

/**
 * Composition des titulaires par rôle, inscrits « tentative » à part, et
 * joueurs à mentionner : titulaires et « tentative » ayant un tag Discord.
 */
export function buildConfirmReminder(signups: ReminderSignup[]): ConfirmReminder {
  const composition: Composition = { tanks: [], healers: [], melee: [], ranged: [] };
  const tentative: CompositionEntry[] = [];
  const players: ConfirmReminder['players'] = [];

  for (const signup of signups) {
    const isStarter = (STARTER_STATUSES as readonly string[]).includes(signup.status);
    const isTentative = signup.status === TENTATIVE_STATUS;
    if (!isStarter && !isTentative) continue;

    const entry = entryOf(signup);
    if (isStarter) composition[raidRoleOf(signup)].push(entry);
    else tentative.push(entry);

    const discordTag = signup.character?.discordTag;
    if (discordTag) players.push({ name: entry.name, discordTag });
  }

  return { composition, tentative, players };
}

/** Temps restant avant le raid, pour le message : « 2 h », « 1 h 30 », « 45 min ». */
export function formatTimeUntil(startTime: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((startTime.getTime() - now.getTime()) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/**
 * Entête du second rappel : temps restant et heure de début dans le fuseau
 * du royaume (SIMS-204), par exemple « commence dans 2 h (21:00) ».
 */
export function confirmReminderHeadline(
  title: string,
  startTime: Date,
  now: Date,
  timeZone: string | null | undefined,
): string {
  const remaining = formatTimeUntil(startTime, now);
  const clock = formatClockTime(startTime, resolveTimeZone(timeZone));

  return `⏰ **${title} commence dans ${remaining} (${clock}) !** Voici la composition annoncée.`;
}

export interface BotCallError {
  message?: string;
  code?: string;
  response?: { status?: number };
}

/** Codes axios d'un appel interrompu sans réponse : le bot a pu publier quand même. */
const AMBIGUOUS_ERROR_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET']);

/**
 * Un appel interrompu (timeout, connexion coupée) ne dit pas si le message est
 * parti : le bot continue après l'abandon du serveur. Le relancer risquerait
 * de publier le rappel deux fois ; on préfère un rappel manqué à un doublon.
 */
export function mayHaveBeenSent(error: BotCallError): boolean {
  return !error.response && !!error.code && AMBIGUOUS_ERROR_CODES.has(error.code);
}

/**
 * Envoie le second rappel des événements dont la fenêtre est ouverte.
 * `confirmReminderSentAt IS NULL` + claim conditionnel : une seule exécution
 * par événement, même si deux ticks se chevauchent. Si l'échec prouve que rien
 * n'est parti (erreur du bot, bot injoignable, base), le claim est relâché pour
 * que le tick suivant réessaie ; sur un appel interrompu, il est conservé.
 */
export async function processDueConfirmReminders(): Promise<void> {
  const now = new Date();

  const events = await prisma.raid_events.findMany({
    where: {
      status: 'SCHEDULED',
      confirmReminderSentAt: null,
      startTime: { gt: now },
      discordChannelId: { not: null },
      discordMessageId: { not: null },
      realm: { discordGuildId: { not: null }, confirmReminderHours: { gt: 0 } },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      discordChannelId: true,
      realm: { select: { discordGuildId: true, confirmReminderHours: true, timezone: true } },
    },
  });

  for (const event of events) {
    const hours = event.realm.confirmReminderHours;
    if (!isConfirmReminderDue(event.startTime, hours, now)) continue;

    const claim = await prisma.raid_events.updateMany({
      where: { id: event.id, confirmReminderSentAt: null },
      data: { confirmReminderSentAt: now },
    });
    if (claim.count === 0) continue;

    try {
      const signups = await prisma.raid_signups.findMany({
        where: {
          eventId: event.id,
          status: { in: [...STARTER_STATUSES, TENTATIVE_STATUS] },
        },
        select: {
          status: true,
          role: true,
          lateTime: true,
          character: {
            select: {
              name: true,
              class: true,
              discordTag: true,
              specialization: { select: { name: true, role: true } },
            },
          },
        },
      });
      const reminder = buildConfirmReminder(signups);

      await axios.put(
        `${config.discord.url}/api/discord/raid/confirm-reminder`,
        {
          guildId: event.realm.discordGuildId,
          channelId: event.discordChannelId,
          headline: confirmReminderHeadline(
            event.title,
            event.startTime,
            now,
            event.realm.timezone,
          ),
          ...reminder,
        },
        { timeout: BOT_TIMEOUT_MS },
      );
      console.log(
        `[RaidReminders] Event ${event.id}: confirm reminder sent (${reminder.players.length} player(s)).`,
      );
    } catch (err) {
      const error = err as BotCallError;
      console.error(
        `[RaidReminders] Event ${event.id}: failed to send confirm reminder (${error.response?.status || error.code || ''})`,
        error.message,
      );
      if (mayHaveBeenSent(error)) continue;

      await prisma.raid_events
        .update({ where: { id: event.id }, data: { confirmReminderSentAt: null } })
        .catch(() => null);
    }
  }
}
