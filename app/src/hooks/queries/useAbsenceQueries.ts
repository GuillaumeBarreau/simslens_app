import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AbsenceFilters,
  CreateAbsencePayload,
  UpdateAbsencePayload,
} from '../../services/absence.service';
import { absenceService } from '../../services/absence.service';

export function useAbsences(filters: AbsenceFilters) {
  return useQuery({
    queryKey: ['absences', filters],
    queryFn: () => absenceService.getAll(filters),
    enabled: !!filters.realmId && filters.realmId > 0,
  });
}

export function useAbsence(id: number | null, realmId: number) {
  return useQuery({
    queryKey: ['absences', id, realmId],
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    queryFn: () => absenceService.getOne(id!, realmId),
    enabled: !!id && !!realmId,
  });
}

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAbsencePayload) => absenceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      realmId,
      payload,
    }: {
      id: number;
      realmId: number;
      payload: UpdateAbsencePayload;
    }) => absenceService.update(id, realmId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['absences', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId: number }) =>
      absenceService.delete(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absences'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
