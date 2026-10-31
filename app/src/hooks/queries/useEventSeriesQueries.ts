import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CreateEventSeriesPayload,
  UpdateEventSeriesPayload,
} from '../../services/eventSeries.service';
import { eventSeriesService } from '../../services/eventSeries.service';

/**
 * Séries de raids récurrents (SIMS-200). Chaque mutation crée, modifie ou
 * annule des événements : elle invalide `['events']`.
 */

export function useCreateEventSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEventSeriesPayload) => eventSeriesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEventSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      realmId,
      payload,
    }: {
      seriesId: number;
      realmId: number;
      payload: UpdateEventSeriesPayload;
    }) => eventSeriesService.update(seriesId, realmId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEventSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      realmId,
      fromDate,
    }: {
      seriesId: number;
      realmId: number;
      fromDate: string;
    }) => eventSeriesService.remove(seriesId, realmId, fromDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
