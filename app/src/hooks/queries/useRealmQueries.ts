import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from 'services/api.client';
import { realmService } from 'services/realm.service';
import type { Realm } from 'types/realm';

export function useUserRealm(
  ownerId?: string | null,
  options?: Omit<UseQueryOptions<Realm | null>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Realm | null>({
    queryKey: ['realm', 'check', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      return realmService.checkUserRealm();
    },
    retry: false,
    enabled: Boolean(ownerId) && options?.enabled !== false,
    ...options,
  });
}

export function useMyRealmPermissions(realmId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['realm', realmId, 'permissions'],
    queryFn: () => realmService.getMyPermissions(realmId!),
    enabled: enabled && realmId !== undefined,
    retry: false,
  });
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/1/regions');
      return data;
    },
  });
}
