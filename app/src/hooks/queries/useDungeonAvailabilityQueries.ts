import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateDungeonAvailabilityPayload,
  DungeonAvailabilityFilters,
  UpdateDungeonAvailabilityPayload,
} from '../../services/dungeonAvailability.service';
import { dungeonAvailabilityService } from '../../services/dungeonAvailability.service';

export function useDungeonAvailabilities(filters: DungeonAvailabilityFilters) {
  return useQuery({
    queryKey: ['dungeonAvailabilities', filters],
    queryFn: () => dungeonAvailabilityService.getAll(filters),
    enabled: !!filters.realmId && filters.realmId > 0,
  });
}

export function useCreateDungeonAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDungeonAvailabilityPayload) =>
      dungeonAvailabilityService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonAvailabilities'] });
    },
  });
}

export function useUpdateDungeonAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      realmId,
      payload,
    }: {
      id: number;
      realmId: number;
      payload: UpdateDungeonAvailabilityPayload;
    }) => dungeonAvailabilityService.update(id, realmId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonAvailabilities'] });
    },
  });
}

export function useDeleteDungeonAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId: number }) =>
      dungeonAvailabilityService.delete(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonAvailabilities'] });
    },
  });
}
