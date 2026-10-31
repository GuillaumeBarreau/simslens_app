import { API_VERSION } from '../config/apiConstants';
import type { UpgradeBatchQuery, UpgradesByItem } from '../types/upgrade.types';
import { apiClient } from './api.client';

export const upgradeService = {
  getBatch: async ({
    itemIds,
    difficulty,
    realmId,
  }: UpgradeBatchQuery): Promise<UpgradesByItem> => {
    const { data } = await apiClient.post(`${API_VERSION}/upgrade/batch`, {
      itemIds,
      difficulty,
      realmId,
    });
    return data ?? {};
  },

  getWishlistBatch: async ({
    itemIds,
    difficulty,
    realmId,
  }: UpgradeBatchQuery): Promise<UpgradesByItem> => {
    const { data } = await apiClient.post(`${API_VERSION}/upgrade/wishlist-batch`, {
      itemIds,
      difficulty,
      realmId,
    });
    return data ?? {};
  },
};
