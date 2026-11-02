import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type BisList, bisService, type SaveBisSlotPayload } from 'services/bis.service';

/** Liste BiS d'une spé pour un palier (SIMS-065). */
export function useBisList(
  realmId: number | null | undefined,
  specializationId: number | null | undefined,
  season: string | null | undefined,
) {
  return useQuery<BisList>({
    queryKey: ['bis', realmId, specializationId, season],
    queryFn: () =>
      bisService.get({
        realmId: realmId as number,
        specializationId: specializationId as number,
        season: season as string,
      }),
    enabled: !!realmId && !!specializationId && !!season,
  });
}

/** Remplace la liste d'un emplacement (liste vide : retour à la référence). */
export function useSaveBisSlot(realmId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slot, payload }: { slot: string; payload: SaveBisSlotPayload }) =>
      bisService.saveSlot(realmId as number, slot, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bis', realmId] });
    },
  });
}
