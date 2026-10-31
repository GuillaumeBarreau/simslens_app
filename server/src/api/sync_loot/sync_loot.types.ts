/**
 * Entrée poussée par le compagnon de bureau (RCLootCouncil).
 *
 * Seuls player, date, time et itemId sont requis ; une entrée incomplète est
 * ignorée plutôt que de faire échouer le lot.
 */
export interface SyncEntry {
  /** « Ghostbane-Hyjal » */
  player: string;
  /** « 12/05/26 » */
  date: string;
  /** « 20:34:12 » */
  time: string;
  itemId: number;
  response?: string | null;
  instance?: string | null;
  boss?: string | null;
  difficulty?: string | null;
  class?: string | null;
  votes?: number | null;
}

export interface IngestLootInput {
  realmId: number;
  source?: string;
  entries: SyncEntry[];
  tokenScopes: string[];
  /** Propriétaire du jeton d'appareil (authBearer). */
  userId: string;
}

export interface IngestLootResult {
  importId: number | null;
  inserted: number;
  duplicates: number;
  /** Joueurs qu'aucun personnage du royaume n'a permis de résoudre. */
  unmatched: string[];
}

/** Ligne prête à être insérée dans imported_loots. */
export interface ImportableLootRow {
  player: string;
  date: string;
  time: string;
  itemID: number;
  response: string | null;
  instance: string | null;
  characterID: number | null;
  /** Gain figé à l'import (SIMS-229) ; `null` sans sim exploitable. */
  upgradePercent: number | null;
  upgradeSimAt: Date | null;
  upgradeSpecializationId: number | null;
  /** Grandeur du sim retenu : `dps` ou `hps` (SIMS-202). */
  upgradeMetric: 'dps' | 'hps' | null;
}
