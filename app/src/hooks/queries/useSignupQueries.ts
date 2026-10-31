import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateSignupPayload } from '../../services/signup.service';
import { signupService } from '../../services/signup.service';

export function useRoster(eventId: number | null, realmId: number) {
  return useQuery({
    queryKey: ['events', eventId, 'roster', realmId],
    queryFn: () => signupService.getRoster(eventId!, realmId),
    enabled: !!eventId && !!realmId,
  });
}

export function useUpsertSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      realmId,
      payload,
    }: {
      eventId: number;
      realmId: number;
      payload: CreateSignupPayload;
    }) => signupService.upsert(eventId, realmId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'roster'],
      });
      queryClient.invalidateQueries({
        queryKey: ['event-roster', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['roster-pool', variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
  });
}

export function useDeleteSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      characterId,
      realmId,
    }: {
      eventId: number;
      characterId: number;
      realmId: number;
    }) => signupService.remove(eventId, characterId, realmId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.eventId] });
      queryClient.invalidateQueries({
        queryKey: ['events', variables.eventId, 'roster'],
      });
      queryClient.invalidateQueries({
        queryKey: ['event-roster', variables.eventId],
      });
      queryClient.invalidateQueries({
        queryKey: ['roster-pool', variables.eventId],
      });
    },
  });
}
