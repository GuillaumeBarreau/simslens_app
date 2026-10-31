import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AddGuestPayload } from '../../services/event.service';
import { guestService } from '../../services/event.service';

export function useAddGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      realmId,
      payload,
    }: {
      eventId: number;
      realmId: number;
      payload: AddGuestPayload;
    }) => guestService.add(eventId, realmId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
    },
  });
}

export function useRemoveGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      guestId,
      realmId,
    }: {
      eventId: number;
      guestId: number;
      realmId: number;
    }) => guestService.remove(eventId, guestId, realmId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['guest-assignments', variables.eventId] });
    },
  });
}

export function useGuestAssignments(eventId: number | null, realmId: number) {
  return useQuery({
    queryKey: ['guest-assignments', eventId, realmId],
    queryFn: () => guestService.getAssignments(eventId!, realmId),
    enabled: !!eventId && !!realmId,
  });
}

export function useToggleGuestAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      guestId,
      bossId,
      realmId,
      role,
    }: {
      eventId: number;
      guestId: number;
      bossId: number;
      realmId: number;
      role: string | null;
    }) => {
      await (role
        ? guestService.upsertAssignment(eventId, guestId, bossId, realmId, role)
        : guestService.removeAssignment(eventId, guestId, bossId, realmId));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guest-assignments', variables.eventId] });
    },
  });
}
