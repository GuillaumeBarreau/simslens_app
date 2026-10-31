import { useQuery } from '@tanstack/react-query';
import { raidService } from 'services/raid.service';

export function useAvailableItems(
  extension: string,
  season: string,
  slot: string,
  classId?: number | null,
  specName?: string | null,
) {
  return useQuery({
    queryKey: ['extensions', extension, 'seasons', season, 'items', slot, classId, specName],
    queryFn: async () => {
      return raidService.getAvailableItems(extension, season, slot, classId, specName);
    },
    enabled: !!extension && !!season && !!slot,
  });
}
