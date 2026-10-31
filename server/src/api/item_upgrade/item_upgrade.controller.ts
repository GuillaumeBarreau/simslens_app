import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import upgradeService from './item_upgrade.service';
import type { CharacterBossUpgradesQuery, UpgradeQuery } from './item_upgrade.types';
import { clearRealmUpgrades } from './usecases/clearRealmUpgrades';
import { getCharacterBossUpgrades as getCharacterBossUpgradesUsecase } from './usecases/getCharacterBossUpgrades';

/**
 * Le module suit encore le pattern historique : les lectures délèguent à
 * item_upgrade.service, à découper en usecases (docs/api/architecture.md).
 */

type RealmScope = { realmId?: number };
type ItemDifficultyParams = { itemID: number; difficulty: string };

export async function getAll(req: Request, res: Response) {
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json(await upgradeService.getAllUpgrades(realmId ?? null));
}

export async function getByItem(req: Request, res: Response) {
  const { itemID, difficulty } = validated<ItemDifficultyParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json(await upgradeService.getUpgradesByItem(itemID, difficulty, realmId ?? null));
}

export async function getByNameItemDifficulty(req: Request, res: Response) {
  const { name, itemID, difficulty } = validated<ItemDifficultyParams & { name: string }>(
    req,
    'params',
  );
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json(
    await upgradeService.getUpgradesByNameItemDifficulty(name, itemID, difficulty, realmId ?? null),
  );
}

export async function getBatch(req: Request, res: Response) {
  const { itemIds, difficulty, realmId } = validated<UpgradeQuery>(req, 'body');
  res.json(await upgradeService.getUpgradesBatch(itemIds, difficulty, realmId ?? null));
}

export async function getWishlistBatch(req: Request, res: Response) {
  const { itemIds, difficulty, realmId } = validated<UpgradeQuery>(req, 'body');
  res.json(await upgradeService.getWishlistBatch(itemIds, difficulty, realmId ?? null));
}

/**
 * Renvoie { specializationId, specialization, specializations, bosses } (SIMS-211).
 */
export async function getCharacterBossUpgrades(req: Request, res: Response) {
  const { characterId } = validated<{ characterId: number }>(req, 'params');
  const query = validated<Omit<CharacterBossUpgradesQuery, 'characterId'>>(req, 'query');
  res.json(await getCharacterBossUpgradesUsecase({ ...query, characterId }));
}

/**
 * Le royaume de la query est celui que checkPermission(EDIT_ROSTER) a vérifié.
 */
export async function clearRealm(req: Request, res: Response) {
  const { realmId } = validated<{ realmId: number }>(req, 'query');
  res.json(await clearRealmUpgrades(realmId));
}
