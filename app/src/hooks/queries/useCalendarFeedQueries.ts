import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { calendarFeedService } from '../../services/calendarFeed.service';

const CALENDAR_FEED_KEY = ['calendar-feed'] as const;

/** État du flux iCal du joueur connecté (SIMS-204). */
export function useCalendarFeedStatus(enabled = true) {
  return useQuery({
    queryKey: CALENDAR_FEED_KEY,
    queryFn: () => calendarFeedService.getStatus(),
    enabled,
  });
}

/** Crée ou régénère le flux : l'ancienne URL cesse de fonctionner. */
export function useRegenerateCalendarFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => calendarFeedService.regenerate(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_FEED_KEY }),
  });
}

export function useRevokeCalendarFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => calendarFeedService.revoke(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CALENDAR_FEED_KEY }),
  });
}
