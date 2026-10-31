import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateEventPayload,
  EventFilters,
  UpdateEventPayload,
} from '../../services/event.service';
import { eventService } from '../../services/event.service';

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => eventService.getAll(filters),
    enabled: !!filters.realmId && filters.realmId > 0,
  });
}

export function useEvent(id: number | null, realmId: number) {
  return useQuery({
    queryKey: ['events', id, realmId],
    queryFn: () => eventService.getOne(id!, realmId),
    enabled: !!id && !!realmId,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => eventService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      realmId,
      payload,
    }: {
      id: number;
      realmId: number;
      payload: UpdateEventPayload;
    }) => eventService.update(id, realmId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
    },
  });
}

export function useCancelEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId: number }) =>
      eventService.cancel(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
export function useDuplicateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      realmId,
      options,
    }: {
      id: number;
      realmId: number;
      options: { title?: string; copySignups: boolean };
    }) => eventService.duplicate(id, realmId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId: number }) =>
      eventService.delete(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
