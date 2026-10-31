import { useQuery } from '@tanstack/react-query';

import { lootService } from 'services/loot.service';

export function useLoots(instanceId?: number, filters?: any, realmId?: number, options?: any) {
  return useQuery({
    queryKey: ['loots', instanceId, filters, realmId],
    queryFn: async () => {
      if (!instanceId) return [];
      return lootService.getAll(instanceId, filters, realmId);
    },
    enabled: Boolean(instanceId),
    ...options,
  });
}
