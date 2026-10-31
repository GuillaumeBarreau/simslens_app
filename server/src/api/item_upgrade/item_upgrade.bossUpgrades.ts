/**
 * Upgrades par boss d'un personnage, pour une spécialisation (SIMS-211).
 *
 * Logique pure, sans accès à la base : le usecase `getCharacterBossUpgrades`
 * rassemble les données, ce module choisit la spé, filtre les sims et met en
 * forme la réponse.
 *
 * Une sim appartient à une spé par `upgrades.specializationId` (SIMS-210) ; une
 * ligne non rattachée (`null`) est rapprochée par son libellé (`upgrades.spec`)
 * avec la même règle que l'import (`workers/simSpecialization.js`).
 */

import { findSimSpecializationInClass } from '../../workers/simSpecialization';

export interface SimSpecialization {
  id: number;
  name: string;
  icon?: string | null;
  role?: string | null;
}

export interface SimCharacterClass {
  name: string;
  specializations: SimSpecialization[];
}

/**
 * Grandeur simulée (SIMS-202) : `dps` (Raidbots) ou `hps` (QE Live, soigneurs).
 * Les gains de deux grandeurs différentes ne se comparent jamais tels quels.
 */
export type SimMetric = 'dps' | 'hps';

export interface SimUpgrade {
  itemID: number;
  dps: number | null;
  baseDps: number | null;
  spec: string | null;
  specializationId: number | null;
  /** Absent ou inconnu : `dps`, valeur par défaut de la colonne. */
  metric?: string | null;
  reportID?: string | null;
  timeStamp: Date | string | null;
}

/** Grandeur d'une sim ; `dps` pour toute valeur absente ou inconnue. */
export function simMetricOf(upgrade: Pick<SimUpgrade, 'metric'>): SimMetric {
  return upgrade.metric === 'hps' ? 'hps' : 'dps';
}

export interface BossLootItem {
  id: number;
  name: string;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
  inventoryType: number | null;
}

export interface BossWithLoots {
  id: number;
  name: string;
  icon: string | null;
  order: number | null;
  raidName: string | null;
  extension: string;
  season: string;
  loots: Array<{ item: BossLootItem }>;
}

export interface TokenReward {
  tokenItemId: number;
  rewardItemId: number;
  slot: string | null;
  item: BossLootItem;
}

/** Spé d'une sim : celle rattachée à la ligne, sinon celle de son libellé. */
export function simSpecializationIdOf(
  upgrade: Pick<SimUpgrade, 'spec' | 'specializationId'>,
  characterClass: SimCharacterClass | null,
): number | null {
  if (upgrade.specializationId != null) return upgrade.specializationId;
  if (!characterClass) return null;
  return findSimSpecializationInClass(characterClass, upgrade.spec)?.id ?? null;
}

function timeOf(upgrade: Pick<SimUpgrade, 'timeStamp'>): number {
  return upgrade.timeStamp ? new Date(upgrade.timeStamp).getTime() : 0;
}

/**
 * Spés pour lesquelles le personnage a des sims, la plus récemment simulée en
 * premier. Les sims dont la spé n'est pas reconnue n'y figurent pas.
 */
export function listSimulatedSpecializations(
  upgrades: SimUpgrade[],
  characterClass: SimCharacterClass | null,
): SimSpecialization[] {
  const latestBySpec = new Map<number, number>();
  for (const u of upgrades) {
    const specId = simSpecializationIdOf(u, characterClass);
    if (specId == null) continue;
    latestBySpec.set(specId, Math.max(latestBySpec.get(specId) ?? 0, timeOf(u)));
  }
  return [...latestBySpec.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .map(([id]) => describeSpecialization(id, characterClass));
}

/** Nom, icône et rôle d'une spé de la classe ; le seul identifiant si elle en est absente. */
export function describeSpecialization(
  id: number,
  characterClass: SimCharacterClass | null,
): SimSpecialization {
  const found = characterClass?.specializations.find((s) => s.id === id);
  return {
    id,
    name: found?.name ?? String(id),
    icon: found?.icon ?? null,
    role: found?.role ?? null,
  };
}

/**
 * Spé retenue : celle demandée, sinon la spé principale du personnage, sinon
 * (personnage sans spé principale) la plus récemment simulée.
 */
export function pickSpecializationId({
  requested,
  mainSpecializationId,
  simulated,
}: {
  requested?: number | null;
  mainSpecializationId?: number | null;
  simulated: SimSpecialization[];
}): number | null {
  return requested ?? mainSpecializationId ?? simulated[0]?.id ?? null;
}

/**
 * Grandeur des sims d'une spé : celle de sa sim la plus récente, `null` si la
 * spé n'a pas de sim. Un import remplace les sims de la même spé et difficulté
 * (SIMS-211), une spé n'a donc normalement qu'une grandeur ; ce choix écarte
 * d'éventuelles lignes anciennes d'une autre grandeur.
 */
export function simMetricForSpecialization(
  upgrades: SimUpgrade[],
  specializationId: number | null,
  characterClass: SimCharacterClass | null,
): SimMetric | null {
  let latest: SimUpgrade | null = null;
  for (const u of upgrades) {
    if (simSpecializationIdOf(u, characterClass) !== specializationId) continue;
    if (!latest || timeOf(u) > timeOf(latest)) latest = u;
  }
  return latest ? simMetricOf(latest) : null;
}

/**
 * Sim la plus récente de chaque objet pour une spé : les sims sont
 * regroupées par (objet, spé) et seules celles de la spé retenue sont gardées,
 * et seulement celles de la grandeur `metric` si elle est donnée (SIMS-202).
 * À date égale, le meilleur gain l'emporte.
 */
export function latestUpgradeByItem<T extends SimUpgrade>(
  upgrades: T[],
  specializationId: number | null,
  characterClass: SimCharacterClass | null,
  metric: SimMetric | null = null,
): Map<number, T> {
  const byItem = new Map<number, T>();
  for (const u of upgrades) {
    if (simSpecializationIdOf(u, characterClass) !== specializationId) continue;
    if (metric != null && simMetricOf(u) !== metric) continue;
    const prev = byItem.get(u.itemID);
    if (!prev) {
      byItem.set(u.itemID, u);
      continue;
    }
    const prevTs = timeOf(prev);
    const curTs = timeOf(u);
    if (curTs > prevTs || (curTs === prevTs && (u.dps || 0) > (prev.dps || 0))) {
      byItem.set(u.itemID, u);
    }
  }
  return byItem;
}

/**
 * Vue par boss : chaque boss renvoie tout son butin ; les objets simulés dans
 * la spé retenue portent `dpsGain` et `gainPercent`, ceux de la wishlist sont
 * marqués `isWishlist`. Les objets sans sim reviennent avec des `null` pour que
 * l'interface affiche « pas de données » au lieu de les masquer.
 *
 * `metric` (SIMS-202) est la grandeur des sims retenues : `dpsGain`, `bestGain`
 * et `expectedGain` sont des HPS quand elle vaut `hps`. Elle est reprise dans
 * `stats.metric` et sur chaque objet simulé, pour que l'interface et la
 * composition ne les comparent pas tels quels à des DPS.
 */
export function buildBossUpgrades({
  bosses,
  upgradeByItemId,
  wishlistItemIds,
  tokenRewards,
  metric = null,
}: {
  bosses: BossWithLoots[];
  upgradeByItemId: Map<number, SimUpgrade>;
  wishlistItemIds: Set<number>;
  tokenRewards: TokenReward[];
  metric?: SimMetric | null;
}) {
  const tokenRewardsMap = new Map<number, TokenReward[]>();
  for (const tr of tokenRewards) {
    const list = tokenRewardsMap.get(tr.tokenItemId) ?? [];
    list.push(tr);
    tokenRewardsMap.set(tr.tokenItemId, list);
  }

  return bosses.map((boss) => {
    const items = boss.loots.map(({ item }) => {
      const rewards = tokenRewardsMap.get(item.id) ?? [];
      const isToken = rewards.length > 0;

      let upgradeSourceId = item.id;
      let resolvedReward: TokenReward | null = null;
      if (isToken) {
        let bestReward = rewards[0];
        let bestGain = -Infinity;
        for (const r of rewards) {
          const u = upgradeByItemId.get(r.rewardItemId);
          if (u && u.dps != null && u.baseDps != null) {
            const gain = u.dps - u.baseDps;
            if (gain > bestGain) {
              bestGain = gain;
              bestReward = r;
            }
          }
        }
        resolvedReward = bestReward;
        upgradeSourceId = bestReward.rewardItemId;
      }

      const u = upgradeByItemId.get(upgradeSourceId);
      const dps = u?.dps ?? null;
      const baseDps = u?.baseDps ?? null;
      const dpsGain = dps != null && baseDps != null ? dps - baseDps : null;
      const gainPercent =
        dps != null && baseDps != null && baseDps > 0 ? ((dps - baseDps) / baseDps) * 100 : null;

      const isWishlist = isToken
        ? rewards.some((r) => wishlistItemIds.has(r.rewardItemId))
        : wishlistItemIds.has(item.id);

      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        quality: item.quality,
        itemLevel: item.itemLevel,
        inventoryType: item.inventoryType,
        isToken,
        rewardItem: resolvedReward
          ? {
              id: resolvedReward.item.id,
              name: resolvedReward.item.name,
              icon: resolvedReward.item.icon,
              quality: resolvedReward.item.quality,
              itemLevel: resolvedReward.item.itemLevel,
              inventoryType: resolvedReward.item.inventoryType,
              slot: resolvedReward.slot,
            }
          : null,
        dps,
        baseDps,
        dpsGain,
        gainPercent,
        hasSimData: u != null,
        isUpgrade: dpsGain != null && dpsGain > 0,
        isBiS: isWishlist,
        isWishlist,
        reportId: u?.reportID ?? null,
        spec: u?.spec ?? null,
        metric: u ? simMetricOf(u) : null,
        timeStamp: u?.timeStamp ?? null,
      };
    });

    items.sort((a, b) => (b.dpsGain ?? -Infinity) - (a.dpsGain ?? -Infinity));

    const upgradesCount = items.filter((i) => i.isUpgrade).length;
    const totalSimmed = items.filter((i) => i.hasSimData).length;
    const highlightedCount = items.filter((i) => i.isUpgrade || i.isBiS).length;
    const bestGain = items.reduce(
      (max, i) => (i.dpsGain != null && i.dpsGain > max ? i.dpsGain : max),
      0,
    );
    const expectedGain =
      totalSimmed > 0
        ? items.reduce((sum, i) => sum + (i.isUpgrade && i.dpsGain != null ? i.dpsGain : 0), 0) /
          totalSimmed
        : 0;

    return {
      boss: {
        id: boss.id,
        name: boss.name,
        icon: boss.icon,
        order: boss.order,
        raidName: boss.raidName,
        extension: boss.extension,
        season: boss.season,
      },
      items,
      stats: {
        totalItems: items.length,
        simmedItems: totalSimmed,
        upgradesCount,
        highlightedCount,
        bestGain,
        expectedGain,
        upgradeChance: highlightedCount > 0 ? (upgradesCount / highlightedCount) * 100 : 0,
        metric,
      },
    };
  });
}

export type BossUpgradesEntry = ReturnType<typeof buildBossUpgrades>[number];
