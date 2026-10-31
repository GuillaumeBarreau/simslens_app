import { useQuery } from '@tanstack/react-query';
import { API_VERSION } from 'config/apiConstants';
import { apiClient } from 'services/api.client';
import { raidService } from 'services/raid.service';
import type { Instance, RaidWithDifficulties } from 'types/raid';

export function useRaids(extension?: string, season?: string, options?: any) {
  return useQuery<RaidWithDifficulties[]>({
    queryKey: ['raids', extension, season],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (extension) params.append('extension', extension);
      if (season) params.append('season', season);
      const url = `${API_VERSION}/raids${params.toString() ? `?${params.toString()}` : ''}`;
      const { data } = await apiClient.get(url);
      return data;
    },
    ...options,
  });
}

export function useInstances(realmId?: number, options?: any) {
  return useQuery<Instance[]>({
    queryKey: ['instances', realmId],
    queryFn: () => raidService.getAllInstances(realmId),
    enabled: !!realmId && options?.enabled !== false,
    ...options,
  });
}
