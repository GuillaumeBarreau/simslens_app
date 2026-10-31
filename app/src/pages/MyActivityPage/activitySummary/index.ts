/**
 * Calculs de « Mon activité » (SIMS-239) : personnage affiché, rendu Blizzard et
 * compteurs du bandeau « À faire ». Fonctions pures, sans React, testées dans
 * `test.ts`.
 */
import { isWantedPriority } from 'constants/wishlistPriority';
import type { CharacterBossUpgrade, CharacterBossUpgradeItem } from 'services/character.service';
import type { RaidEvent } from 'services/event.service';
import type { Character, EnchantVerifyResult, WishlistRecord } from 'types/character.types';
import type { LinkedCharacter } from 'types/user.types';
import { getReportFreshness, parseReportTimestamp, type ReportFreshness } from 'utils/droptimizer';

/** État d'une carte du bandeau : sa couleur et son icône en dépendent. */
export type TodoStatus = 'ok' | 'warning' | 'alert' | 'neutral';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Personnage de l'en-tête : celui de la liste du royaume (données complètes,
 * rapports compris) ; à défaut celui du compte Battle.net (`/auth/me`), quand le
 * personnage choisi appartient à un autre royaume que celui consulté.
 */
export function resolveActivityCharacter(
  characters: Character[] | undefined,
  linkedCharacters: LinkedCharacter[] | undefined,
  selectedCharacterId: number | null | undefined,
): Character | undefined {
  if (!selectedCharacterId) return undefined;
  const fromRealm = characters?.find((c) => Number(c.id) === selectedCharacterId);
  if (fromRealm) return fromRealm;
  const linked = linkedCharacters?.find((c) => Number(c.id) === selectedCharacterId);
  return linked ? (linked as unknown as Character) : undefined;
}

/**
 * URL d'un rendu Blizzard du personnage à partir de sa vignette (« avatar »).
 * La vignette arrive en chemin relatif (`hyjal/96/123-avatar.jpg`) ou en URL
 * complète ; `null` sans vignette.
 */
export function characterRenderUrl(
  thumbnail: string | null | undefined,
  region: string | null | undefined,
  variant: 'avatar' | 'inset' | 'main-raw' = 'avatar',
): string | null {
  if (!thumbnail) return null;
  const base = /^https?:\/\//.test(thumbnail)
    ? thumbnail
    : `https://render.worldofwarcraft.com/${(region || 'eu').toLowerCase()}/character/${thumbnail}`;
  if (variant === 'avatar') return base;
  const extension = variant === 'main-raw' ? 'png' : 'jpg';
  return base.replace(/-avatar\.jpg$/, `-${variant}.${extension}`);
}

export type SignupStatus = 'PRESENT' | 'ABSENT' | 'TENTATIVE' | 'LATE' | 'BENCH';

/**
 * Statut d'inscription du personnage à un raid. Sans inscription, un raid
 * « présent par défaut » compte comme présent.
 */
export function effectiveSignupStatus(
  event: Pick<RaidEvent, 'signups' | 'defaultPresent'>,
  characterId: number | null | undefined,
): SignupStatus | null {
  if (!characterId) return null;
  const signup = event.signups?.find((s) => Number(s.characterId) === characterId);
  if (signup) return signup.status;
  return event.defaultPresent ? 'PRESENT' : null;
}

/** Un raid reste à confirmer sans réponse ou avec une réponse « incertain ». */
export function needsConfirmation(status: SignupStatus | null): boolean {
  return status === null || status === 'TENTATIVE';
}

export interface RaidTodo {
  status: TodoStatus;
  /** Raids sans réponse ferme. */
  pending: number;
  total: number;
}

export function computeRaidTodo(
  events: Pick<RaidEvent, 'signups' | 'defaultPresent'>[],
  characterId: number | null | undefined,
): RaidTodo {
  const total = events.length;
  const pending = events.filter((e) =>
    needsConfirmation(effectiveSignupStatus(e, characterId)),
  ).length;
  let status: TodoStatus = 'ok';
  if (total === 0) status = 'neutral';
  else if (pending > 0) status = 'warning';
  return { status, pending, total };
}

/** Jours calendaires entre aujourd'hui et la date du raid (0 = aujourd'hui). */
export function daysUntil(startTime: string | number | Date, now: Date = new Date()): number {
  const start = new Date(startTime);
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startDay - today) / DAY_MS);
}

type DifficultyReport = { id: string; timestamp: number; hasNoUpgrade?: boolean } | null;

type SimSource = Pick<Character, 'reportsByDifficulty' | 'recentReportTimestamp'>;

export interface SimTodo {
  status: TodoStatus;
  /** `unknown` : la donnée n'est pas fournie pour ce personnage. */
  freshness: ReportFreshness | 'unknown';
  /** Âge en jours entiers, `null` sans rapport. */
  ageDays: number | null;
  /** Horodatage du dernier rapport en millisecondes. */
  timestamp: number | null;
}

const FRESHNESS_STATUS: Record<ReportFreshness, TodoStatus> = {
  fresh: 'ok',
  late: 'warning',
  stale: 'alert',
  missing: 'alert',
};

/** Rapport le plus récent, toutes difficultés confondues. */
export function latestReport(source: SimSource): { ms: number; hasNoUpgrade: boolean } | null {
  const reports = Object.values(source.reportsByDifficulty ?? {}) as DifficultyReport[];
  let latest: { ms: number; hasNoUpgrade: boolean } | null = null;
  for (const report of reports) {
    const ms = parseReportTimestamp(report?.timestamp);
    if (ms !== null && (!latest || ms > latest.ms)) {
      latest = { ms, hasNoUpgrade: !!report?.hasNoUpgrade };
    }
  }
  if (latest) return latest;
  const recent = parseReportTimestamp(source.recentReportTimestamp);
  return recent === null ? null : { ms: recent, hasNoUpgrade: false };
}

/**
 * Fraîcheur du dernier sim, au seuil de la guilde. Un rapport « sans upgrade »
 * reste à jour, comme pour le bouton de mise à jour du Droptimizer.
 */
export function computeSimTodo(
  source: SimSource | undefined,
  now: number = Date.now(),
  staleAfterDays?: number,
): SimTodo {
  const known =
    !!source &&
    (source.reportsByDifficulty !== undefined || source.recentReportTimestamp !== undefined);
  if (!known) return { status: 'neutral', freshness: 'unknown', ageDays: null, timestamp: null };

  const report = latestReport(source);
  if (!report) return { status: 'alert', freshness: 'missing', ageDays: null, timestamp: null };

  const freshness = report.hasNoUpgrade
    ? 'fresh'
    : getReportFreshness(report.ms, now, staleAfterDays);
  return {
    status: FRESHNESS_STATUS[freshness],
    freshness,
    ageDays: Math.max(0, Math.floor((now - report.ms) / DAY_MS)),
    timestamp: report.ms,
  };
}

export type GearIssue = 'missing' | 'invalid' | 'rank1';

export interface GearAnomaly {
  slot: string;
  kind: 'enchant' | 'gem';
  issue: GearIssue;
  /** Nom de l'enchantement en place, s'il est connu. */
  displayName?: string | null;
}

function issueOf(reason: string, isValid: boolean | null, rank: number | null | undefined) {
  if (reason === 'missing') return 'missing';
  if (reason === 'invalid') return 'invalid';
  if (isValid && rank === 1) return 'rank1';
  return null;
}

/**
 * Anomalies relevées par `/enchantments/verify` : enchantement ou gemme
 * manquant, invalide, ou de rang 1 seulement (avertissement).
 */
export function listGearAnomalies(verify: EnchantVerifyResult | undefined): GearAnomaly[] {
  if (!verify) return [];
  const anomalies: GearAnomaly[] = [];
  for (const r of verify.results ?? []) {
    const issue = issueOf(r.reason, r.isValid, r.craftingQuality);
    if (issue) anomalies.push({ slot: r.slot, kind: 'enchant', issue, displayName: r.displayName });
  }
  for (const r of verify.gems ?? []) {
    const issue = issueOf(r.reason, r.isValid, r.rank);
    if (issue) anomalies.push({ slot: r.slot, kind: 'gem', issue });
  }
  return anomalies;
}

/** Anomalies regroupées par emplacement, pour les pastilles du paperdoll. */
export function anomaliesBySlot(anomalies: GearAnomaly[]): Record<string, GearAnomaly[]> {
  const bySlot: Record<string, GearAnomaly[]> = {};
  for (const anomaly of anomalies) {
    (bySlot[anomaly.slot] ??= []).push(anomaly);
  }
  return bySlot;
}

/** Gravité d'un emplacement : `alert` dès qu'un élément manque ou est invalide. */
export function slotSeverity(anomalies: GearAnomaly[] | undefined): TodoStatus {
  if (!anomalies?.length) return 'ok';
  return anomalies.some((a) => a.issue !== 'rank1') ? 'alert' : 'warning';
}

export interface GearTodo {
  status: TodoStatus;
  /** Éléments manquants ou invalides. */
  issues: number;
  /** Éléments de rang 1. */
  minor: number;
  anomalies: GearAnomaly[];
}

export function computeGearTodo(verify: EnchantVerifyResult | undefined): GearTodo {
  const checked = !!verify && ((verify.results?.length ?? 0) > 0 || (verify.gems?.length ?? 0) > 0);
  if (!checked) return { status: 'neutral', issues: 0, minor: 0, anomalies: [] };

  const anomalies = listGearAnomalies(verify);
  const minor = anomalies.filter((a) => a.issue === 'rank1').length;
  const issues = anomalies.length - minor;
  let status: TodoStatus = 'ok';
  if (issues > 0) status = 'alert';
  else if (minor > 0) status = 'warning';
  return { status, issues, minor, anomalies };
}

const WEAPON_SLOTS = new Set(['main_hand', 'off_hand', 'two_hand']);
/** 14 emplacements d'armure et de bijoux, plus l'arme (une ou deux mains). */
export const WISHLIST_TOTAL_SLOTS = 15;
/** Au-delà, la wishlist est considérée comme complète. */
export const WISHLIST_COMPLETE_THRESHOLD = Math.ceil(WISHLIST_TOTAL_SLOTS * 0.8);

/** Emplacements remplis par un vœu ; les armes ne comptent qu'une fois. */
export function countWishlistFilled(wishlist: WishlistRecord | undefined): number {
  if (!wishlist) return 0;
  let armor = 0;
  let hasWeapon = false;
  for (const [slot, data] of Object.entries(wishlist)) {
    // « Je n'en veux pas » ne remplit pas l'emplacement (SIMS-205).
    if (!data || data.itemId == null || !isWantedPriority(data.priority)) continue;
    if (WEAPON_SLOTS.has(slot)) hasWeapon = true;
    else armor++;
  }
  return Math.min(WISHLIST_TOTAL_SLOTS, armor + (hasWeapon ? 1 : 0));
}

export interface WishlistTodo {
  status: TodoStatus;
  filled: number;
  total: number;
  percent: number;
}

export function computeWishlistTodo(wishlist: WishlistRecord | undefined): WishlistTodo {
  const total = WISHLIST_TOTAL_SLOTS;
  if (!wishlist) return { status: 'neutral', filled: 0, total, percent: 0 };
  const filled = countWishlistFilled(wishlist);
  let status: TodoStatus = 'warning';
  if (filled >= WISHLIST_COMPLETE_THRESHOLD) status = 'ok';
  else if (filled === 0) status = 'alert';
  return { status, filled, total, percent: Math.round((filled / total) * 100) };
}

type BossEntry = Pick<CharacterBossUpgrade, 'boss' | 'items' | 'stats'>;

export interface TopUpgrade {
  item: CharacterBossUpgradeItem;
  bossName: string;
}

/** Meilleurs gains, tous boss confondus, du plus fort au plus faible. */
export function topUpgrades(bosses: BossEntry[] | undefined, limit = 3): TopUpgrade[] {
  const all: TopUpgrade[] = [];
  for (const entry of bosses ?? []) {
    for (const item of entry.items) {
      if (item.isUpgrade && (item.dpsGain ?? 0) > 0) all.push({ item, bossName: entry.boss.name });
    }
  }
  return all.sort((a, b) => (b.item.dpsGain ?? 0) - (a.item.dpsGain ?? 0)).slice(0, limit);
}

/** Boss au meilleur gain, `null` si aucun n'en offre. */
export function bestBossId(bosses: BossEntry[] | undefined): number | null {
  let best: BossEntry | null = null;
  for (const entry of bosses ?? []) {
    if (entry.stats.bestGain > 0 && (!best || entry.stats.bestGain > best.stats.bestGain)) {
      best = entry;
    }
  }
  return best ? best.boss.id : null;
}

/** Loot d'un boss : upgrades par gain décroissant, puis vœux, puis le reste. */
export function sortBossLoot(items: CharacterBossUpgradeItem[]): CharacterBossUpgradeItem[] {
  const rank = (i: CharacterBossUpgradeItem) => {
    if (i.isUpgrade) return 0;
    if (i.isWishlist) return 1;
    return 2;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || (b.dpsGain ?? 0) - (a.dpsGain ?? 0));
}

/** Nombre de cartes du bandeau qui demandent une action. */
export function countTodoActions(statuses: TodoStatus[]): number {
  return statuses.filter((s) => s === 'warning' || s === 'alert').length;
}
