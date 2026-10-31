import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { BossNote, SaveBossNotePayload } from '../../services/bossNote.service';
import { bossNoteService } from '../../services/bossNote.service';

export function useBossNotes(eventId: number | null, realmId: number, enabled = true) {
  return useQuery<BossNote[]>({
    queryKey: ['boss-notes', eventId, realmId],
    queryFn: () => bossNoteService.list(eventId as number, realmId),
    enabled: !!eventId && !!realmId && enabled,
    staleTime: 30_000,
  });
}

export function useSaveBossNote(eventId: number | null, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bossId, payload }: { bossId: number; payload: SaveBossNotePayload }) =>
      bossNoteService.save(eventId as number, realmId, bossId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boss-notes', eventId] });
    },
  });
}
