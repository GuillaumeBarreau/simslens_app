import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attunementService, type SaveAttunementPayload } from 'services/attunement.service';

/** Référentiel des chaînes de quêtes : données de jeu, fixes pendant la session. */
export function useAttunementDefinitions() {
  return useQuery({
    queryKey: ['attunements', 'definitions'],
    queryFn: () => attunementService.getDefinitions(),
    staleTime: Infinity,
  });
}

export function useRealmAttunements(realmId: number | undefined) {
  return useQuery({
    queryKey: ['attunements', 'realm', realmId],
    queryFn: () => attunementService.getRealmAttunements(realmId as number),
    enabled: !!realmId,
  });
}

export function useSaveAttunement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveAttunementPayload) => attunementService.save(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attunements', 'realm'] });
    },
  });
}
