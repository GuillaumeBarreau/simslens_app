import { useQuery } from '@tanstack/react-query';
import { upgradeService } from 'services/upgrade.service';

export function useUpgradesBatch(
  itemIds: number[],
  difficulty: string,
  realmId?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ['upgradesBatch', itemIds.join(','), difficulty, realmId],
    queryFn: () => upgradeService.getBatch({ itemIds, difficulty, realmId }),
    enabled: enabled && itemIds.length > 0,
  });
}

export function useWishlistUpgradesBatch(
  itemIds: number[],
  difficulty: string,
  realmId?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ['upgradesBatch', itemIds.join(','), difficulty, 'wishlist', realmId],
    queryFn: () => upgradeService.getWishlistBatch({ itemIds, difficulty, realmId }),
    enabled: enabled && itemIds.length > 0,
  });
}
