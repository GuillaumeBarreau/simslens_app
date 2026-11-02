import type { ID, ISODate, WowRegion } from './common.types';

export interface Specialization {
  id: ID;
  name: string;
  classId: ID;
  /** "tank" | "healer" | "dps" */
  role: string;
  icon?: string | null;
  /** Libellé propre au jeu demandé (`?game=`), ex. « Combat » dans Forever. */
  label?: string;
}

export interface WowClass {
  id: ID;
  name: string;
  specializations?: Specialization[];
}

/**
 * Character as returned by the API (DB fields + optional relations).
 * Mirrors the `characters` Prisma model, extended with API-enriched fields.
 */
export interface Character {
  id: ID;
  lastModified: ISODate | number;
  name: string;
  /** WoW class name, e.g. "warrior" */
  class: string;
  realm: string;
  region?: WowRegion | string | null;
  thumbnail?: string | null;
  archived?: number | null;
  archivedAt?: Date | null;

  /** "approved" | "pending" */
  status: string;
  spec?: string | null;
  specializationId?: ID | null;
  specialization?: Specialization;
  currentPeriodKeyCount?: number | null;
  ManaforgeBuff?: string | null;
  ilvl?: number | null;
  score?: number | null;
  discordTag?: string | null;
  realmId?: ID | null;
  userId?: string | null;
  /** Most recent Raidbots report ID (across all difficulties) */
  recentReportId?: string | null;
  /** Timestamp of the most recent report (ISO string or Unix ms, across all difficulties) */
  recentReportTimestamp?: ISODate | number | null;
  reportsByDifficulty?: {
    normal: { id: string; timestamp: number; hasNoUpgrade?: boolean } | null;
    heroic: { id: string; timestamp: number; hasNoUpgrade?: boolean } | null;
    mythic: { id: string; timestamp: number; hasNoUpgrade?: boolean } | null;
  } | null;
  isBackup?: boolean;
  /** Guild name from the linked realm */
  guildName?: string;
  /** Computed role from spec (populated by some endpoints) */
  role?: string;
  hasDiscord?: boolean;
  isGuest?: boolean;
}

export interface GearSnapshotItem {
  id: ID;
  snapshotId: ID;
  slot: string;
  itemId: ID;
  ilevel: number;
  encodedItem: string;
  enchantId?: number | null;
  gemIds?: string | null;
  upgradeLevel?: number | null;
  upgradeMax?: number | null;
  upgradeName?: string | null;
  upgradeFullName?: string | null;
  upgradeBonusId?: number | null;
  upgradeItemLevel?: number | null;
  upgradeGroup?: number | null;
  baseItemLevel?: number | null;
  /** "raid" | "craft" | "other" */
  itemSource?: string | null;
  craftingQuality?: number | null;
}

export interface GearSnapshot {
  id: ID;
  characterId: ID;
  reportId: string;
  spec: string;
  difficulty: string;
  timestamp: ISODate;
  createdAt: ISODate;
  items: GearSnapshotItem[];
}

/** Latest gear snapshot with item details, as returned by GET /character/:id/gear/latest. */
export interface LatestGearResponse {
  snapshot: {
    items: Array<{
      slot: string;
      itemId: number;
      ilevel: number;
      upgradeItemLevel?: number;
      item: { name: string; icon: string; quality: number; itemLevel?: number };
    }>;
  } | null;
}

/** Enchant and gem check of the equipped gear, as returned by GET /enchantments/verify/:id. */
export interface EnchantVerifyResult {
  results: Array<{
    slot: string;
    isValid: boolean | null;
    reason: string;
    craftingQuality?: number | null;
    displayName?: string | null;
  }>;
  gems: Array<{ slot: string; isValid: boolean | null; reason: string; rank: number | null }>;
}

/**
 * A single slot entry in a character's wishlist, as returned by the API.
 * The API transforms the DB array into a Record keyed by slot name.
 */
export interface WishlistSlotData {
  itemId: ID | null;
  itemName?: string;
  icon?: string;
  ilvl?: number;
  quality?: string;
  priority: number;
}

/**
 * Wishlist as returned by GET /characters/:id/wishlist.
 * Keyed by slot name (e.g. "head", "chest", "main_hand").
 */
export type WishlistRecord = Record<string, WishlistSlotData>;

/**
 * État d'un vœu (SIMS-205), voir GET /characters/:id/wishlist/status :
 * déjà porté, battu par l'équipement actuel (gain ≤ 0), gain, sans sim, ou
 * « je n'en veux pas ».
 */
export type WishState =
  'equipped' | 'equipped_upgrade' | 'no_gain' | 'upgrade' | 'not_simulated' | 'not_wanted';

export interface WishSlotStatus {
  itemId: ID;
  priority: number;
  state: WishState;
  obsolete: boolean;
  dpsGain: number | null;
  gainPercent: number | null;
  equippedItemLevel: number | null;
}

export interface WishlistStatus {
  specializationId: ID;
  difficulty: string;
  snapshot: { specializationId: ID | null; timestamp: ISODate; sameSpec: boolean } | null;
  slots: Record<string, WishSlotStatus>;
}

/** Objet de raid du même emplacement qu'un vœu (SIMS-205). */
export interface WishlistSlotAlternative {
  itemId: ID;
  name: string;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
  boss: { id: ID; name: string } | null;
  dpsGain: number | null;
  gainPercent: number | null;
  hasSimData: boolean;
  isWish: boolean;
}

export interface WishlistSlotAlternatives {
  slot: string;
  specializationId: ID;
  difficulty: string;
  wishItemId: ID | null;
  alternatives: WishlistSlotAlternative[];
}

export interface WishlistEntry {
  id: ID;
  characterId: ID;
  specializationId: ID;
  slot: string;
  itemId?: ID | null;
  /** 0 = not set, 1 = BiS … 4 = low, 5 = not wanted (SIMS-205, constants/wishlistPriority) */
  priority?: number | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  item?: {
    id: ID;
    name: string;
    icon: string;
    quality: number;
    itemLevel: number;
    inventoryType: number | null;
  };
}

/**
 * A specialization exposed by GET /characters/:id/wishlist/specs.
 * Lists the specs available for a character (based on class) with a primary flag.
 */
export interface CharacterSpecOption {
  id: ID;
  name: string;
  classId: ID;
  role: string;
  icon?: string | null;
  isPrimary: boolean;
}

/**
 * A class and its specializations, as served by
 * GET /1/character/classes/specializations (reference data, SIMS-212).
 * Spec names are the English names of the database: translate them with
 * `specializationLabel`.
 */
export interface ClassSpecializations {
  id: ID;
  /** Normalized class name, e.g. "death_knight" */
  name: string;
  specializations: Specialization[];
}

/** A spec of the character's class, from GET /1/character/:id/specializations. */
export interface CharacterSpecializationOption {
  id: ID;
  name: string;
  role: string;
  icon: string | null;
  isPrimary: boolean;
  isOffSpec: boolean;
  /** Sim upgrades or gear are linked to this spec. */
  hasSimData: boolean;
}

export interface CharacterSpecializations {
  characterId: ID;
  className: string;
  primarySpecializationId: ID | null;
  offSpecializationIds: ID[];
  specializations: CharacterSpecializationOption[];
}

export interface UpdateCharacterSpecializationsPayload {
  /** New main spec; omitted, the main spec is unchanged. */
  specializationId?: ID;
  /** Full off-spec list: replaces the previous one. */
  offSpecializationIds: ID[];
}

/** Wishlists of specs hidden by the roster view (SIMS-212). */
export interface RosterHiddenSpecWishlists {
  character: { id: ID; name: string; class: string; specializationId: ID | null };
  displayedSpecializationId: ID;
  hiddenSpecializations: {
    id: ID;
    name: string | null;
    itemCount: number;
    isDeclaredOffSpec: boolean;
  }[];
}

export interface CreateCharacterPayload {
  name: string;
  realm: string;
  region?: string;
  class?: string;
  realmId?: number;
  lastModified?: number;
  spec?: string;
}

export interface UpdateCharacterPayload {
  name?: string;
  class?: string;
  realm?: string;
  region?: string;
  realmId?: number;
  discordTag?: string;
  ilvl?: number;
  score?: number;
  spec?: string;
  specializationId?: number;
  status?: string;
}
