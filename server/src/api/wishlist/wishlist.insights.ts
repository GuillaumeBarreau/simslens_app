/**
 * État des vœux et alternatives d'un emplacement (SIMS-205).
 *
 * Logique pure, sans accès à la base : les usecases `getWishlistStatus` et
 * `getWishlistSlotAlternatives` rassemblent les données, ce module décide.
 *
 * Les gains viennent des sims **de la spé de la wishlist** uniquement, avec la
 * règle des upgrades par boss (SIMS-211, `latestUpgradeByItem`) : la sim la
 * plus récente de chaque objet pour cette spé.
 */

import { isWantedPriority } from '../../shared/constants/wishlistPriority';
import type { SimCharacterClass, SimUpgrade } from '../item_upgrade/item_upgrade.bossUpgrades';
import { latestUpgradeByItem } from '../item_upgrade/item_upgrade.bossUpgrades';

/**
 * - `equipped` : l'objet est déjà porté (dernier relevé d'équipement) et aucune
 *   sim de la difficulté ne lui trouve de gain ;
 * - `equipped_upgrade` : porté, mais la sim de la difficulté choisie lui trouve
 *   un gain (exemplaire d'une difficulté inférieure) : non obsolète ;
 * - `no_gain` : la sim de la spé ne lui trouve aucun gain (≤ 0) : l'équipement
 *   actuel fait aussi bien ou mieux ;
 * - `upgrade` : la sim lui trouve un gain ;
 * - `not_simulated` : aucune sim de cette spé et de cette difficulté ;
 * - `not_wanted` : le joueur a marqué l'objet « je n'en veux pas ».
 */
export type WishState =
  'equipped' | 'equipped_upgrade' | 'no_gain' | 'upgrade' | 'not_simulated' | 'not_wanted';

export interface WishRow {
  slot: string;
  itemId: number | null;
  priority: number | null;
}

export interface GearSnapshot {
  specializationId: number | null;
  timestamp: Date | string;
  items: Array<{ slot: string; itemId: number; ilevel: number }>;
}

export interface WishSlotStatus {
  itemId: number;
  priority: number;
  state: WishState;
  /** Vœu à revoir : objet déjà porté ou battu par l'équipement actuel. */
  obsolete: boolean;
  dpsGain: number | null;
  gainPercent: number | null;
  /** Niveau d'objet de l'exemplaire porté, si l'objet est porté. */
  equippedItemLevel: number | null;
}

export interface WishlistStatus {
  specializationId: number;
  difficulty: string;
  /** Relevé d'équipement utilisé ; `sameSpec` faux s'il vient d'une autre spé. */
  snapshot: { specializationId: number | null; timestamp: string; sameSpec: boolean } | null;
  slots: Record<string, WishSlotStatus>;
}

/** Le relevé de la spé de la wishlist, sinon le plus récent toutes spés. */
export function pickGearSnapshot(
  forSpec: GearSnapshot | null | undefined,
  latest: GearSnapshot | null | undefined,
): { snapshot: GearSnapshot; sameSpec: boolean } | null {
  if (forSpec) return { snapshot: forSpec, sameSpec: true };
  if (latest) return { snapshot: latest, sameSpec: false };
  return null;
}

/** Gain d'une sim : DPS gagné et pourcentage, `null` sans sim exploitable. */
export function simGain(sim: Pick<SimUpgrade, 'dps' | 'baseDps'> | null | undefined) {
  if (!sim || sim.dps == null || sim.baseDps == null) {
    return { dpsGain: null, gainPercent: null };
  }
  const dpsGain = sim.dps - sim.baseDps;
  return {
    dpsGain,
    gainPercent: sim.baseDps > 0 ? (dpsGain / sim.baseDps) * 100 : null,
  };
}

/**
 * Verdict d'un vœu. Ordre de la règle : « je n'en veux pas » d'abord (jamais
 * obsolète, ce n'est pas un vœu), puis gain simulé positif (il prime sur
 * « déjà porté » : l'exemplaire porté est sans doute d'une difficulté
 * inférieure, `equipped_upgrade`), puis objet porté, puis gain nul ou négatif.
 */
export function evaluateWish({
  priority,
  equippedItemLevel,
  dpsGain,
  hasSim,
}: {
  priority: number | null;
  equippedItemLevel: number | null;
  dpsGain: number | null;
  hasSim: boolean;
}): { state: WishState; obsolete: boolean } {
  if (!isWantedPriority(priority)) return { state: 'not_wanted', obsolete: false };
  const simulated = hasSim && dpsGain != null;
  if (simulated && dpsGain > 0) {
    return { state: equippedItemLevel != null ? 'equipped_upgrade' : 'upgrade', obsolete: false };
  }
  if (equippedItemLevel != null) return { state: 'equipped', obsolete: true };
  if (!simulated) return { state: 'not_simulated', obsolete: false };
  return { state: 'no_gain', obsolete: true };
}

/** Meilleur niveau d'objet porté pour chaque objet du relevé (anneaux, bijoux en double). */
function equippedLevels(snapshot: GearSnapshot | null): Map<number, number> {
  const levels = new Map<number, number>();
  for (const item of snapshot?.items ?? []) {
    levels.set(item.itemId, Math.max(levels.get(item.itemId) ?? 0, item.ilevel));
  }
  return levels;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** État de chaque vœu d'une wishlist (une spé, une difficulté). */
export function buildWishlistStatus({
  specializationId,
  difficulty,
  wishes,
  snapshots,
  sims,
  characterClass,
}: {
  specializationId: number;
  difficulty: string;
  wishes: WishRow[];
  snapshots: { forSpec: GearSnapshot | null; latest: GearSnapshot | null };
  sims: SimUpgrade[];
  characterClass: SimCharacterClass | null;
}): WishlistStatus {
  const picked = pickGearSnapshot(snapshots.forSpec, snapshots.latest);
  const equipped = equippedLevels(picked?.snapshot ?? null);
  const simByItem = latestUpgradeByItem(sims, specializationId, characterClass);

  const slots: Record<string, WishSlotStatus> = {};
  for (const wish of wishes) {
    if (wish.itemId == null) continue;
    const sim = simByItem.get(wish.itemId);
    const { dpsGain, gainPercent } = simGain(sim);
    const equippedItemLevel = equipped.get(wish.itemId) ?? null;
    slots[wish.slot] = {
      itemId: wish.itemId,
      priority: wish.priority ?? 0,
      ...evaluateWish({
        priority: wish.priority,
        equippedItemLevel,
        dpsGain,
        hasSim: sim != null,
      }),
      dpsGain,
      gainPercent,
      equippedItemLevel,
    };
  }

  return {
    specializationId,
    difficulty,
    snapshot: picked
      ? {
          specializationId: picked.snapshot.specializationId,
          timestamp: toIso(picked.snapshot.timestamp),
          sameSpec: picked.sameSpec,
        }
      : null,
    slots,
  };
}

export interface RaidBoss {
  id: number;
  name: string;
  order: number | null;
}

/**
 * Boss qui lâche chaque objet : directement, sinon par le jeton qui le donne.
 * Un objet lâché par plusieurs boss garde le premier dans l'ordre du raid.
 */
export function bossByItem({
  drops,
  tokenLinks,
}: {
  drops: Array<{ itemId: number; boss: RaidBoss }>;
  tokenLinks: Array<{ tokenItemId: number; rewardItemId: number }>;
}): Map<number, RaidBoss> {
  const direct = new Map<number, RaidBoss>();
  for (const drop of drops) {
    const prev = direct.get(drop.itemId);
    if (!prev || (drop.boss.order ?? Infinity) < (prev.order ?? Infinity)) {
      direct.set(drop.itemId, drop.boss);
    }
  }
  const result = new Map(direct);
  for (const link of tokenLinks) {
    if (result.has(link.rewardItemId)) continue;
    const boss = direct.get(link.tokenItemId);
    if (boss) result.set(link.rewardItemId, boss);
  }
  return result;
}

export interface SlotCandidate {
  id: number;
  name: string;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
}

export interface SlotAlternative {
  itemId: number;
  name: string;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
  boss: { id: number; name: string } | null;
  dpsGain: number | null;
  gainPercent: number | null;
  hasSimData: boolean;
  /** L'objet actuellement souhaité sur cet emplacement. */
  isWish: boolean;
}

export interface SlotAlternatives {
  slot: string;
  specializationId: number;
  difficulty: string;
  wishItemId: number | null;
  alternatives: SlotAlternative[];
}

/**
 * Alternatives d'un emplacement : les objets de raid sélectionnables sur cet
 * emplacement, avec le gain simulé de la spé et le boss qui les lâche. Les
 * objets sans boss de la saison (hors raid) sont écartés. Tri : meilleur gain
 * d'abord, objets sans sim en dernier, puis par nom.
 */
export function buildSlotAlternatives({
  slot,
  specializationId,
  difficulty,
  candidates,
  wishItemId,
  sims,
  characterClass,
  bosses,
}: {
  slot: string;
  specializationId: number;
  difficulty: string;
  candidates: SlotCandidate[];
  wishItemId: number | null;
  sims: SimUpgrade[];
  characterClass: SimCharacterClass | null;
  bosses: Map<number, RaidBoss>;
}): SlotAlternatives {
  const simByItem = latestUpgradeByItem(sims, specializationId, characterClass);
  const seen = new Set<number>();
  const alternatives: SlotAlternative[] = [];

  for (const item of candidates) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const boss = bosses.get(item.id);
    if (!boss) continue;
    const sim = simByItem.get(item.id);
    alternatives.push({
      itemId: item.id,
      name: item.name,
      icon: item.icon,
      quality: item.quality,
      itemLevel: item.itemLevel,
      boss: { id: boss.id, name: boss.name },
      ...simGain(sim),
      hasSimData: sim != null,
      isWish: item.id === wishItemId,
    });
  }

  alternatives.sort(
    (a, b) => (b.dpsGain ?? -Infinity) - (a.dpsGain ?? -Infinity) || a.name.localeCompare(b.name),
  );

  return { slot, specializationId, difficulty, wishItemId, alternatives };
}
