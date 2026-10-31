/**
 * Lecture des vues multi-personnages de l'optimiseur de loot (SIMS-234) :
 * `POST /1/upgrade/batch` et `POST /1/upgrade/wishlist-batch`.
 *
 * Une seule spé par personnage, choisie comme dans la vue par boss (SIMS-211) :
 * sa spé principale, sinon la dernière simulée à cette difficulté. Les sims des
 * autres spés ne s'y mélangent jamais ; chaque ligne porte la spé retenue
 * (`simSpecialization`) pour que l'interface l'affiche.
 *
 * Ces usecases renvoient les lignes brutes retenues ; le service historique
 * (`item_upgrade.service.js`) les met en forme pour le client.
 */

import { isWantedPriority } from '../../../shared/constants/wishlistPriority';
import tokenRepository from '../../item_tokens/item_tokens.repository';
import {
  keepRetainedSpecUpgrades,
  keepRetainedSpecWishes,
  latestRetainedUpgradeByCharacterItem,
  resolveRetainedSpecializations,
  type RetainedSpecialization,
  withWishlistFallback,
} from '../item_upgrade.batchSpecialization';
import type { SimSpecialization, SimUpgrade } from '../item_upgrade.bossUpgrades';
import upgradeRepository, { type BatchWishlistRow } from '../item_upgrade.repository';
import type { UpgradeQuery, UpgradeRow } from '../item_upgrade.types';

/** Objet spécial « tous les jetons » : ses sims sont celles de toutes les récompenses de jeton. */
const ALL_TOKENS_ITEM_ID = 237602;

type BatchUpgradeRow = UpgradeRow & SimUpgrade & { characterID: number };

export type SelectedUpgrade = BatchUpgradeRow & { simSpecialization: SimSpecialization | null };

/**
 * Objets dont on lit les sims pour un objet demandé : les récompenses d'un
 * jeton, toutes les récompenses de jeton pour l'objet « tous les jetons »,
 * sinon l'objet lui-même.
 */
export async function resolveTargetItemIds(itemId: number): Promise<number[]> {
  if (await tokenRepository.isToken(itemId)) {
    const rewards = await tokenRepository.getTokenRewards(itemId);
    return [...new Set(rewards.map((r) => Number(r.rewardItemId)))];
  }
  if (itemId === ALL_TOKENS_ITEM_ID) {
    const allRewardIds: number[] = [];
    for (const token of await tokenRepository.getAllTokens()) {
      const rewards = await tokenRepository.getTokenRewards(token.tokenItemId);
      allRewardIds.push(...rewards.map((r) => Number(r.rewardItemId)));
    }
    return [...new Set(allRewardIds)];
  }
  return [itemId];
}

async function listItemUpgrades(
  targetItemIds: number[],
  difficulty: string,
  realmId: number | null,
): Promise<BatchUpgradeRow[]> {
  const rows: BatchUpgradeRow[] = [];
  for (const targetId of targetItemIds) {
    const upgrades = await upgradeRepository.listUpgradesByItemAndDifficulty(
      targetId,
      difficulty,
      realmId,
    );
    if (upgrades?.length) rows.push(...(upgrades as BatchUpgradeRow[]));
  }
  return rows;
}

async function retainedSpecializationsFor(
  characterIds: number[],
  difficulty: string,
): Promise<Map<number, RetainedSpecialization>> {
  if (characterIds.length === 0) return new Map();
  const context = await upgradeRepository.getSimSpecializationContext(characterIds, difficulty);
  return resolveRetainedSpecializations(context);
}

function simSpecializationOf(
  characterId: number,
  retained: Map<number, RetainedSpecialization>,
): SimSpecialization | null {
  return retained.get(characterId)?.specialization ?? null;
}

/**
 * Sims de chaque objet demandé, dans la spé retenue de chaque personnage.
 * Clé : l'objet demandé (un jeton regroupe les sims de ses récompenses).
 */
export async function selectUpgradesBatch({
  itemIds,
  difficulty,
  realmId = null,
}: UpgradeQuery): Promise<Map<number, SelectedUpgrade[]>> {
  const rowsByItem = new Map<number, BatchUpgradeRow[]>();
  for (const itemId of itemIds) {
    rowsByItem.set(
      itemId,
      await listItemUpgrades(await resolveTargetItemIds(itemId), difficulty, realmId),
    );
  }

  const characterIds = [...rowsByItem.values()].flat().map((u) => u.characterID);
  const retained = await retainedSpecializationsFor(characterIds, difficulty);

  const result = new Map<number, SelectedUpgrade[]>();
  for (const [itemId, rows] of rowsByItem) {
    result.set(
      itemId,
      keepRetainedSpecUpgrades(rows, retained).map((u) => ({
        ...u,
        simSpecialization: simSpecializationOf(u.characterID, retained),
      })),
    );
  }
  return result;
}

/** Ligne de la vue wishlist : la sim retenue du vœu, ou une ligne sans gain. */
export type SelectedWish = Record<string, unknown> & {
  characterID: number;
  itemID: number | null;
  dps: number | null;
  baseDps: number | null;
  simSpecialization: SimSpecialization | null;
  isWishlist: 1;
  wishlistSlot: string;
};

/**
 * Vœux de chaque objet demandé, avec le gain de la sim la plus récente dans la
 * même spé. Seuls les vœux de la spé retenue du personnage sont gardés (un
 * par objet) ; « je n'en veux pas » n'est pas un vœu (SIMS-205). Sans spé
 * principale ni sim reconnue, la spé retenue est celle du vœu modifié le plus
 * récemment.
 */
export async function selectWishlistBatch({
  itemIds,
  difficulty,
  realmId = null,
}: UpgradeQuery): Promise<Map<number, SelectedWish[]>> {
  const perItem = new Map<number, { wishes: BatchWishlistRow[]; upgrades: BatchUpgradeRow[] }>();
  for (const itemId of itemIds) {
    const targetItemIds = await resolveTargetItemIds(itemId);
    const wishes = (
      await upgradeRepository.listWishlistEntriesForItems(targetItemIds, realmId)
    ).filter((w) => isWantedPriority(w.priority));
    const upgrades = await listItemUpgrades(targetItemIds, difficulty, realmId);
    perItem.set(itemId, { wishes, upgrades });
  }

  const allWishes = [...perItem.values()].flatMap((p) => p.wishes);
  const retained = withWishlistFallback(
    await retainedSpecializationsFor(
      allWishes.map((w) => w.characterId),
      difficulty,
    ),
    allWishes,
  );
  const upgradeByCharacterItem = latestRetainedUpgradeByCharacterItem(
    [...perItem.values()].flatMap((p) => p.upgrades),
    retained,
  );

  const result = new Map<number, SelectedWish[]>();
  for (const [itemId, { wishes }] of perItem) {
    result.set(
      itemId,
      keepRetainedSpecWishes(wishes, retained).map((w): SelectedWish => {
        const simSpecialization = simSpecializationOf(w.characterId, retained);
        const realUpgrade = upgradeByCharacterItem.get(`${w.characterId}-${w.itemId}`);
        if (realUpgrade) {
          return { ...realUpgrade, simSpecialization, isWishlist: 1, wishlistSlot: w.slot };
        }
        return {
          characterID: w.characterId,
          itemID: w.itemId,
          dps: null,
          baseDps: null,
          difficulty,
          characters: w.character,
          items: w.item,
          timeStamp: new Date(),
          simSpecialization,
          isWishlist: 1,
          wishlistSlot: w.slot,
        };
      }),
    );
  }
  return result;
}
