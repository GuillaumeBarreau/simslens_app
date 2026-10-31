import { z } from 'zod';

export const RaidsSchema = z.object({
  id: z.number(),
  name: z.string(),
  instanceId: z.number().nullable(),
  description: z.string().nullable(),
  image_button: z.string().nullable(),
  image_button_small: z.string().nullable(),
  image_background: z.string().nullable(),
});

export const RaidDifficultiesSchema = z.object({
  id: z.number(),
  raidId: z.number(),
  difficulty: z.string(),
  description: z.string().nullable(),
  image_button: z.string().nullable(),
  image_button_small: z.string().nullable(),
  image_background: z.string().nullable(),
});

export const InstancesSchema = z.object({
  id: z.number(),
  name: z.string(),
  date: z.date(),
  raidDifficultyId: z.number(),
  realmId: z.number(),
  createdBy: z.number(),
  status: z.string().default('ONGOING'),
  bossesKilled: z.number().default(0),
  totalBosses: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CharactersSchema = z.object({
  id: z.number(),
  lastModified: z.date(),
  name: z.string(),
  class: z.string(),
  realm: z.string(),
  region: z.string().nullable(),
  thumbnail: z.string().nullable(),
  archived: z.number().nullable(),
  archivedAt: z.date().nullable(),
  status: z.string(),
  spec: z.string().nullable(),
  currentPeriodKeyCount: z.number().nullable(),
  ManaforgeBuff: z.string().nullable(),
  ilvl: z.number().nullable(),
  score: z.number().nullable(),
  discordTag: z.string().nullable(),
  realmId: z.number().nullable(),
  userId: z.string().nullable(),
});

export const ItemsSchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  quality: z.number(),
  itemLevel: z.number(),
  inventoryType: z.number().nullable(),
  itemClass: z.number().nullable(),
  itemSubClass: z.number().nullable(),
  allowableClasses: z.string().nullable(),
});

export type Raids = z.infer<typeof RaidsSchema>;
export type RaidDifficulties = z.infer<typeof RaidDifficultiesSchema>;
export type Instances = z.infer<typeof InstancesSchema>;
export type Characters = z.infer<typeof CharactersSchema>;
export type Items = z.infer<typeof ItemsSchema>;

export type raids = Raids;
export type raid_difficulties = RaidDifficulties;
export type instances = Instances;
export type characters = Characters;
export type items = Items;

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum SignupStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  TENTATIVE = 'TENTATIVE',
  BENCH = 'BENCH',
  LATE = 'LATE',
}

import type { MemberAbsence } from '../services/absence.service';
import type { RaidEvent, RaidSignup } from '../services/event.service';
import type {
  GearSnapshot,
  GearSnapshotItem,
  Specialization,
  WishlistEntry,
} from './character.types';
import type { BossDrop, InstanceLoot, Upgrade } from './loot.types';
import type { Realm } from './realm';

/** Base boss entity (DB fields only, no API relations) */
export interface BossBase {
  id: number;
  name: string;
  extension: string;
  season: string;
  raidName?: string | null;
  order: number;
  icon?: string | null;
}

export interface InstanceBoss {
  id: number;
  instanceId: number;
  bossId: number;
  killed: boolean;
  killedAt?: string | null;
  boss?: BossBase;
}

export interface Difficulty {
  name: string;
}

export interface Region {
  id: number;
  name: string;
}

export interface Server {
  id: number;
  name: string;
  slug: string;
  locale: string;
  category: string;
  region: string;
}

export interface RealmOwner {
  id: number;
  realmId: number;
  ownerId: string;
  role: 'owner' | 'admin' | 'moderator';
}

export interface ImportedLoot {
  id: number;
  importID: number;
  characterID?: number | null;
  player?: string | null;
  date?: string | null;
  time?: string | null;
  itemID?: number | null;
  response?: string | null;
  instance?: string | null;
  owner?: number | null;
}

export interface Import {
  id: number;
  filename: string;
  importedAt: number;
  rowCount: number;
}

export interface ItemToken {
  id: number;
  tokenItemId: number;
  rewardItemId: number;
  class: string;
  armorType?: string | null;
  slot: string;
  tokenType: string;
  extension: string;
  season: string;
}

export interface WowItem {
  id: number;
  name: string;
  quality: number;
  itemLevel: number;
  inventoryType: number;
  itemClass: number;
  itemSubClass: number;
  icon: string;
  description?: string | null;
  stats?: unknown;
  rawData: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface ItemBonusData {
  id: number;
  upgradeGroup?: number | null;
  upgradeLevel?: number | null;
  upgradeMax?: number | null;
  upgradeName?: string | null;
  upgradeFullName?: string | null;
  upgradeItemLevel?: number | null;
  upgradeSeasonId?: number | null;
  upgradePriority?: number | null;
  quality?: number | null;
  levelModifier?: number | null;
  tag?: string | null;
  rawStats?: unknown;
  statsDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enchantment {
  id: number;
  displayName: string;
  tokenizedName: string;
  spellId?: number | null;
  spellIcon?: string | null;
  itemId?: number | null;
  itemIcon?: string | null;
  quality?: number | null;
  expansion?: number | null;
  craftingQuality?: number | null;
  slot?: string | null;
  socketType?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  stats?: unknown;
}

export type realms = Realm;
export type realm_owners = RealmOwner;
export type specializations = Specialization;
export type character_wishlists = WishlistEntry;
export type character_gear_snapshots = GearSnapshot;
export type gear_snapshot_items = GearSnapshotItem;
export type instance_loots = InstanceLoot;
export type boss_drop = BossDrop;
export type bosses = BossBase;
export type instance_bosses = InstanceBoss;
export type upgrades = Upgrade;
export type member_absences = MemberAbsence;
export type raid_events = RaidEvent;
export type raid_signups = RaidSignup;
export type difficulties = Difficulty;
export type regions = Region;
export type servers = Server;
export type imported_loots = ImportedLoot;
export type imports = Import;
export type item_tokens = ItemToken;
export type wow_items = WowItem;
export type item_bonus_data = ItemBonusData;
export type enchantments = Enchantment;
export type classes = { id: number; name: string };
