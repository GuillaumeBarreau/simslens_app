import { useQuery } from '@tanstack/react-query';

import type { Boss } from 'types/raid';
import { apiClient } from 'services/api.client';
import { raidService } from 'services/raid.service';
import { API_VERSION } from 'config/apiConstants';

export function useBosses(extension?: string, season?: string, options?: any) {
  return useQuery<Boss[]>({
    queryKey: ['bosses', extension, season],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (extension) params.append('extension', extension);
      if (season) params.append('season', season);

      const url = `${API_VERSION}/bosses${params.toString() ? `?${params.toString()}` : ''}`;

      const { data } = await apiClient.get(url);
      return data;
    },
    ...options,
  });
}

export function useBossesByRaid(extension?: string, season?: string, options?: any) {
  return useQuery<Boss[]>({
    queryKey: ['bosses', 'raid', extension, season],
    queryFn: async () => {
      if (!extension || !season) return [];
      return raidService.getBossesByRaid(extension, season);
    },
    enabled: Boolean(extension && season) && options?.enabled !== false,
    ...options,
  });
}

export function useInstanceBosses(instanceId?: number, realmId?: number, options?: any) {
  return useQuery({
    queryKey: ['instances', instanceId, 'bosses', realmId],
    queryFn: async () => {
      if (!instanceId) return [];
      return raidService.getInstanceBosses(instanceId, realmId);
    },
    enabled: Boolean(instanceId),
    ...options,
  });
}
