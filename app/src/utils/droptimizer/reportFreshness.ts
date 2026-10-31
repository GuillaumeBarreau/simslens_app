/**
 * Fraîcheur d'un rapport Droptimizer : seuils partagés par la page Tracking,
 * « Mon activité », le bouton de mise à jour (SIMS-137) et l'optimiseur (SIMS-199).
 */

/** En dessous : rapport à jour. */
export const REPORT_FRESH_DAYS = 3;
/**
 * À partir de ce seuil : rapport périmé. Entre les deux : en retard.
 * Valeur par défaut : la guilde fournit la sienne via `simStaleAfterDays`
 * (réglages de validation, SIMS-199).
 */
export const REPORT_STALE_DAYS = 7;

export type ReportFreshness = 'fresh' | 'late' | 'stale' | 'missing';

export type ReportTimestamp = number | string | Date | null | undefined;

const DAY_MS = 1000 * 60 * 60 * 24;

/** Les rapports arrivent en millisecondes ou en secondes selon la source. */
export function reportTimestampMs(timestamp: number): number {
  return timestamp > 1e11 ? timestamp : timestamp * 1000;
}

/**
 * Horodatage d'un rapport en millisecondes, quelle que soit sa forme : nombre
 * (secondes ou millisecondes), chaîne numérique, date ISO (réponses de
 * /upgrade) ou Date. `null` si la valeur est absente ou illisible.
 */
export function parseReportTimestamp(value: ReportTimestamp): number | null {
  if (value === null || value === undefined || value === '') return null;
  let ms: number;
  if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(value.trim())) {
    ms = reportTimestampMs(Number(value));
  } else {
    ms = Date.parse(value);
  }
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** Âge du rapport en jours (fractionnaire). */
export function reportAgeDays(timestamp: number, now: number = Date.now()): number {
  return (now - reportTimestampMs(timestamp)) / DAY_MS;
}

/** Seuil de péremption utilisable : la valeur reçue si elle est un entier positif. */
export function resolveStaleAfterDays(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : REPORT_STALE_DAYS;
}

export function freshnessFromAge(
  days: number,
  staleAfterDays: number = REPORT_STALE_DAYS,
): Exclude<ReportFreshness, 'missing'> {
  // Un seuil de péremption plus court que la fenêtre « à jour » la réduit d'autant.
  if (days < Math.min(REPORT_FRESH_DAYS, staleAfterDays)) return 'fresh';
  if (days < staleAfterDays) return 'late';
  return 'stale';
}

export function getReportFreshness(
  timestamp: ReportTimestamp,
  now: number = Date.now(),
  staleAfterDays: number = REPORT_STALE_DAYS,
): ReportFreshness {
  const ms = parseReportTimestamp(timestamp);
  if (ms === null) return 'missing';
  return freshnessFromAge(reportAgeDays(ms, now), staleAfterDays);
}

/** Couleurs Mantine par état, alignées sur le tableau de suivi. */
export const FRESHNESS_COLOR: Record<ReportFreshness, string> = {
  fresh: 'teal.8',
  late: 'orange.5',
  stale: 'red.5',
  missing: 'gray',
};
