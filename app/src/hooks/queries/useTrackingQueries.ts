import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { characterService } from 'services/character.service';
import { trackingService } from 'services/tracking.service';

const TRACKING_STALE_TIME = 60_000;

export function useTrackingRoster(difficulty: string | undefined, realmId: number | undefined) {
  return useQuery({
    queryKey: ['characters', 'roster', difficulty, realmId],
    queryFn: () => characterService.getRoster(difficulty, realmId),
    enabled: !!realmId,
    staleTime: TRACKING_STALE_TIME,
  });
}

export function useImportedLoots(realmId: number | undefined) {
  return useQuery({
    queryKey: ['imported_loots', 'bulk', realmId],
    queryFn: () => trackingService.getImportedLoots(realmId as number),
    enabled: !!realmId,
    staleTime: TRACKING_STALE_TIME,
  });
}

export function useGearSnapshots(characterIds: number[]) {
  return useQuery({
    queryKey: ['characters', 'gear', 'bulk', characterIds],
    queryFn: () => trackingService.getGearSnapshots(characterIds),
    enabled: characterIds.length > 0,
    staleTime: TRACKING_STALE_TIME,
  });
}

export function useEnchantChecks(characterIds: number[]) {
  return useQuery({
    queryKey: ['characters', 'enchantments', 'bulk', characterIds],
    queryFn: () => trackingService.getEnchantChecks(characterIds),
    enabled: characterIds.length > 0,
    staleTime: TRACKING_STALE_TIME,
  });
}

export function useRefreshRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (realmId: number) => trackingService.refreshRoster(realmId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['characters'] }),
  });
}

export function useClearRealmUpgrades() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (realmId: number) => trackingService.clearUpgrades(realmId),
    onSuccess: () => {
      for (const key of ['upgradeCounts', 'imported_loots', 'characters', 'upgradesBatch']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}
