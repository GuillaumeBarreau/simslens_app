/**
 * Parcours de la wishlist (SIMS-250) : emplacements à remplir, progression,
 * emplacement suivant, provenance et gain des objets, meilleure suggestion par
 * emplacement, regroupement des vœux par boss et tri des candidats d'un
 * emplacement. Fonctions pures, sans appel réseau : les données viennent des
 * routes existantes (wishlist, upgrades par boss, objets disponibles).
 */
import type { CharacterBossUpgrade, CharacterBossUpgradeItem } from 'services/character.service';

import { BOTTOM_SLOTS, getClassSlotOverrides, getClassWeaponConfig } from '../constants';

/** Emplacements d'armure, dans l'ordre de la liste. */
export const ARMOR_SLOTS = [
  'head',
  'shoulders',
  'back',
  'chest',
  'wrists',
  'hands',
  'waist',
  'legs',
  'feet',
] as const;

export const JEWELRY_SLOTS = ['neck', 'finger1', 'finger2', 'trinket1', 'trinket2'] as const;

export type SlotGroup = 'armor' | 'jewelry' | 'weapons';

/** Vœu tel que la wishlist le renvoie, réduit à ce que le parcours lit. */
export interface WishLike {
  itemId?: number | null;
}

export type WishMap = Record<string, WishLike | undefined | null>;

export function isSlotFilled(wishlist: WishMap | undefined, slot: string): boolean {
  return wishlist?.[slot]?.itemId != null;
}

/**
 * Emplacements d'arme proposés : une arme à deux mains choisie masque les deux
 * autres, une main droite ou gauche choisie masque l'arme à deux mains ; sans
 * choix, toutes les armes permises à la classe.
 */
export function getWeaponSlots(characterClass: string | undefined, wishlist?: WishMap): string[] {
  const allowed = getClassWeaponConfig(characterClass)?.allowedSlots ?? BOTTOM_SLOTS;
  const allowsTwoHand = allowed.includes('two_hand');
  const allowsOneHand = allowed.includes('main_hand') || allowed.includes('off_hand');
  if (!allowsTwoHand || !allowsOneHand) return [...allowed];

  if (isSlotFilled(wishlist, 'two_hand')) return ['two_hand'];
  if (isSlotFilled(wishlist, 'main_hand') || isSlotFilled(wishlist, 'off_hand')) {
    return allowed.filter((slot) => slot !== 'two_hand');
  }
  return [...allowed];
}

/** Emplacements de la wishlist, groupés, dans l'ordre de la liste. */
export function getSlotGroups(
  characterClass: string | undefined,
  wishlist?: WishMap,
): Array<{ group: SlotGroup; slots: string[] }> {
  return [
    { group: 'armor', slots: [...ARMOR_SLOTS] },
    { group: 'jewelry', slots: [...JEWELRY_SLOTS] },
    { group: 'weapons', slots: getWeaponSlots(characterClass, wishlist) },
  ];
}

/** Tous les emplacements proposés, à plat, dans l'ordre de la liste. */
export function getWishlistSlots(characterClass: string | undefined, wishlist?: WishMap): string[] {
  return getSlotGroups(characterClass, wishlist).flatMap(({ slots }) => slots);
}

/**
 * Progression « x / 16 » : 14 emplacements d'armure et de bijoux, plus les
 * armes. Sans arme choisie, une main droite et une main gauche (16) ; avec une
 * arme à deux mains, un seul emplacement d'arme (15).
 */
export function getWishlistProgress(
  characterClass: string | undefined,
  wishlist?: WishMap,
): { filled: number; total: number; percent: number } {
  const weapons = getWeaponSlots(characterClass, wishlist);
  const oneHand = weapons.filter((slot) => slot !== 'two_hand');
  const weaponSlots = weapons.length === 1 ? weapons : oneHand.length > 0 ? oneHand : weapons;
  const counted = [...ARMOR_SLOTS, ...JEWELRY_SLOTS, ...weaponSlots];
  const filled = counted.filter((slot) => isSlotFilled(wishlist, slot)).length;
  const total = counted.length;
  return { filled, total, percent: total === 0 ? 0 : Math.round((filled / total) * 100) };
}

/**
 * Prochain emplacement vide après `current`, en reprenant au début de la liste ;
 * `null` quand tout est rempli. Sans `current`, le premier vide.
 */
export function getNextEmptySlot(
  slots: string[],
  wishlist: WishMap | undefined,
  current?: string | null,
): string | null {
  if (slots.length === 0) return null;
  const start = current ? slots.indexOf(current) : -1;
  for (let step = 1; step <= slots.length; step += 1) {
    const slot = slots[(start + step + slots.length) % slots.length];
    if (slot !== current && !isSlotFilled(wishlist, slot)) return slot;
  }
  return null;
}

/** Clé i18n (espace `wishlist`) du libellé d'un emplacement, selon la classe. */
export function getSlotLabelKey(slot: string, characterClass?: string): string {
  const override = getClassSlotOverrides(characterClass)?.[slot];
  if (override?.label === 'Main Hand') return 'slots.main_hand';
  if (override?.label === 'Off Hand') return 'slots.off_hand';
  return `slots.${slot}`;
}

/** Objet affiché pour une ligne de butin : la récompense d'un jeton, sinon l'objet. */
export interface LootItem {
  id: number;
  name: string;
  icon: string;
  quality: number;
  inventoryType: number | null;
}

export function displayedLoot(item: CharacterBossUpgradeItem): LootItem {
  const reward = item.isToken ? item.rewardItem : null;
  if (reward) {
    return {
      id: reward.id,
      name: reward.name,
      icon: reward.icon,
      quality: reward.quality,
      inventoryType: reward.inventoryType,
    };
  }
  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    quality: item.quality,
    inventoryType: item.inventoryType,
  };
}

/** Provenance et gain d'un objet de raid pour la spé de la wishlist. */
export interface ItemSource {
  bossId: number;
  bossName: string;
  bossOrder: number;
  dpsGain: number | null;
  gainPercent: number | null;
  hasSimData: boolean;
}

/**
 * Index objet → boss et gain simulé, à partir des upgrades par boss de la spé.
 * Un jeton est indexé sous son id et sous celui de sa récompense.
 */
export function buildItemSourceIndex(
  bosses: CharacterBossUpgrade[] | undefined,
): Map<number, ItemSource> {
  const index = new Map<number, ItemSource>();
  for (const { boss, items } of bosses ?? []) {
    for (const item of items) {
      const source: ItemSource = {
        bossId: boss.id,
        bossName: boss.name,
        bossOrder: boss.order,
        dpsGain: item.hasSimData ? item.dpsGain : null,
        gainPercent: item.hasSimData ? item.gainPercent : null,
        hasSimData: item.hasSimData,
      };
      if (!index.has(item.id)) index.set(item.id, source);
      const rewardId = item.isToken ? item.rewardItem?.id : undefined;
      if (rewardId != null && !index.has(rewardId)) index.set(rewardId, source);
    }
  }
  return index;
}

/**
 * Types d'inventaire acceptés par chaque emplacement de la wishlist : miroir de
 * `SLOT_INVENTORY_TYPES` (server/src/shared/constants/wow.js).
 */
export const SLOT_INVENTORY_TYPES: Record<string, number[]> = {
  head: [1],
  neck: [2],
  shoulders: [3],
  back: [16],
  chest: [5, 20],
  wrists: [9],
  hands: [10],
  waist: [6],
  legs: [7],
  feet: [8],
  finger1: [11],
  finger2: [11],
  trinket1: [12],
  trinket2: [12],
  main_hand: [13, 21],
  off_hand: [14, 22, 23],
  two_hand: [17, 15, 26, 25],
};

export interface SlotSuggestion {
  item: LootItem;
  bossName: string;
  dpsGain: number;
  gainPercent: number | null;
}

/**
 * Meilleure suggestion d'un emplacement : l'objet de raid au plus fort gain
 * simulé positif dont le type d'inventaire convient à l'emplacement (ou à
 * `querySlot`, ex. une arme en main gauche), hors objets déjà souhaités.
 */
export function bestSuggestionForSlot(
  bosses: CharacterBossUpgrade[] | undefined,
  slot: string,
  options: { querySlot?: string; excludedItemIds?: Set<number> } = {},
): SlotSuggestion | null {
  const types = SLOT_INVENTORY_TYPES[options.querySlot ?? slot] ?? [];
  let best: SlotSuggestion | null = null;
  for (const { boss, items } of bosses ?? []) {
    for (const item of items) {
      if (!item.hasSimData || item.dpsGain == null || item.dpsGain <= 0) continue;
      const loot = displayedLoot(item);
      if (loot.inventoryType == null || !types.includes(loot.inventoryType)) continue;
      if (options.excludedItemIds?.has(loot.id) || options.excludedItemIds?.has(item.id)) continue;
      if (!best || item.dpsGain > best.dpsGain) {
        best = {
          item: loot,
          bossName: boss.name,
          dpsGain: item.dpsGain,
          gainPercent: item.gainPercent,
        };
      }
    }
  }
  return best;
}

export function wishedItemIds(wishlist: WishMap | undefined): Set<number> {
  const ids = new Set<number>();
  for (const wish of Object.values(wishlist ?? {})) {
    if (wish?.itemId != null) ids.add(Number(wish.itemId));
  }
  return ids;
}

/** Suggestion de chaque emplacement vide (les emplacements remplis n'en ont pas). */
export function getSlotSuggestions(
  bosses: CharacterBossUpgrade[] | undefined,
  slots: string[],
  wishlist: WishMap | undefined,
  querySlotOf: (slot: string) => string | undefined = () => undefined,
): Record<string, SlotSuggestion> {
  const excluded = wishedItemIds(wishlist);
  const suggestions: Record<string, SlotSuggestion> = {};
  for (const slot of slots) {
    if (isSlotFilled(wishlist, slot)) continue;
    const suggestion = bestSuggestionForSlot(bosses, slot, {
      querySlot: querySlotOf(slot),
      excludedItemIds: excluded,
    });
    if (suggestion) suggestions[slot] = suggestion;
  }
  return suggestions;
}

export interface BossWish {
  slot: string;
  itemId: number;
  source: ItemSource;
}

export interface BossWishGroup {
  boss: { id: number; name: string; icon: string | null; order: number };
  wishes: BossWish[];
}

/**
 * Vœux de la wishlist rangés par boss, dans l'ordre du raid. Renvoie aussi les
 * vœux sans boss connu (autre source) et les boss où rien n'est souhaité.
 */
export function groupWishesByBoss(
  bosses: CharacterBossUpgrade[] | undefined,
  wishlist: WishMap | undefined,
  slots: string[],
): {
  groups: BossWishGroup[];
  otherSlots: string[];
  bossesWithoutWish: string[];
} {
  const index = buildItemSourceIndex(bosses);
  const byBoss = new Map<number, BossWish[]>();
  const otherSlots: string[] = [];

  for (const slot of slots) {
    const itemId = wishlist?.[slot]?.itemId;
    if (itemId == null) continue;
    const source = index.get(Number(itemId));
    if (!source) {
      otherSlots.push(slot);
      continue;
    }
    const list = byBoss.get(source.bossId) ?? [];
    list.push({ slot, itemId: Number(itemId), source });
    byBoss.set(source.bossId, list);
  }

  const ordered = [...(bosses ?? [])].sort((a, b) => a.boss.order - b.boss.order);
  const groups: BossWishGroup[] = [];
  const bossesWithoutWish: string[] = [];
  for (const { boss } of ordered) {
    const wishes = byBoss.get(boss.id);
    if (wishes?.length) {
      groups.push({
        boss: { id: boss.id, name: boss.name, icon: boss.icon, order: boss.order },
        wishes,
      });
    } else {
      bossesWithoutWish.push(boss.name);
    }
  }
  return { groups, otherSlots, bossesWithoutWish };
}

export interface Candidate {
  id: number;
  name: string;
  bossName?: string | null;
}

export interface CandidateGain {
  dpsGain: number | null;
  gainPercent: number | null;
  hasSimData: boolean;
}

/** Rang de tri : gain positif, puis gain nul ou négatif, puis sans sim. */
function gainRank(gain: CandidateGain | undefined): number {
  if (!gain?.hasSimData || gain.dpsGain == null) return 2;
  return gain.dpsGain > 0 ? 0 : 1;
}

/**
 * Candidats d'un emplacement filtrés (recherche, boss) et triés : meilleurs
 * gains simulés d'abord, puis sans gain, puis sans sim ; à égalité, par nom.
 */
export function rankCandidates<T extends Candidate>(
  items: T[],
  gains: Map<number, CandidateGain>,
  filters: { search?: string; boss?: string | null } = {},
): T[] {
  const search = filters.search?.trim().toLowerCase() ?? '';
  return items
    .filter((item) => !search || item.name.toLowerCase().includes(search))
    .filter((item) => !filters.boss || item.bossName === filters.boss)
    .sort((a, b) => {
      const ga = gains.get(a.id);
      const gb = gains.get(b.id);
      const rank = gainRank(ga) - gainRank(gb);
      if (rank !== 0) return rank;
      const diff = (gb?.dpsGain ?? 0) - (ga?.dpsGain ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
}

/** Boss distincts des candidats, pour le filtre du tiroir (ordre d'apparition). */
export function candidateBosses(items: Candidate[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (item.bossName) seen.add(item.bossName);
  }
  return [...seen];
}

/** Gain compact pour l'affichage : « +3.1k », « +420 », « 0 », « — » sans sim. */
export function formatDpsGain(gain: number | null | undefined): string {
  if (gain == null) return '—';
  if (gain <= 0) return '0';
  if (gain >= 1000) return `+${(gain / 1000).toFixed(1)}k`;
  return `+${Math.round(gain)}`;
}
