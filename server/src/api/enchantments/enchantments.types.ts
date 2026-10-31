export interface SnapshotItem {
  slot: string;
  enchantId: number | null;
  /** Identifiants de gemmes séparés par des barres obliques. */
  gemIds: string | null;
  encodedItem: string | null;
}

export interface GearSnapshot {
  characterId: number;
  items: SnapshotItem[];
  character?: { class: string | null } | null;
}

export interface EnchantmentRecord {
  id: number;
  /** Nullable en base : un enchantement peut ne pas porter de sort connu. */
  spellId: number | null;
  displayName: string;
  craftingQuality: number | null;
}

export type EnchantmentMap = Record<number, EnchantmentRecord>;

export type EnchantReason = 'missing' | 'unknown' | 'not_configured' | 'valid' | 'invalid';

export interface EnchantResult {
  slot: string;
  category: string;
  enchantId: number | null;
  spellId: number | null;
  displayName: string | null;
  craftingQuality: number | null;
  /** null quand aucune liste de référence n'est configurée pour la famille. */
  isValid: boolean | null;
  reason: EnchantReason;
}

export interface GemSlotResult {
  slot: string;
  gemIds: number[];
  isValid: boolean | null;
  reason: string;
  rank: number | null;
}

export interface GemResults {
  slots: GemSlotResult[];
  hasEpicGem: boolean;
}

export interface CharacterVerification {
  results: EnchantResult[];
  gems: GemSlotResult[];
  hasEpicGem: boolean;
}
