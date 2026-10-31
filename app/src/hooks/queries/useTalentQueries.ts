import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { talentService } from 'services/talent.service';
import type { SelectedNodes } from 'types/talent.types';

export function useTalentTree(
  characterId: number | null | undefined,
  specializationId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['talent-tree', specializationId],
    queryFn: () => talentService.getTree(characterId as number, specializationId as number),
    enabled: !!characterId && !!specializationId,
    staleTime: 60 * 60_000, // l'arbre ne change qu'entre patchs
  });
}

export function useCharacterTalents(
  characterId: number | null | undefined,
  specializationId: number | null | undefined,
) {
  return useQuery({
    queryKey: ['character', characterId, 'talents', specializationId],
    queryFn: () => talentService.getLoadout(characterId as number, specializationId as number),
    enabled: !!characterId && !!specializationId,
  });
}

export function useSaveTalents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      specializationId,
      selectedNodes,
      exportString,
      label,
    }: {
      characterId: number;
      specializationId: number;
      selectedNodes: SelectedNodes;
      exportString?: string | null;
      label?: string | null;
    }) =>
      talentService.saveLoadout(characterId, specializationId, selectedNodes, exportString, label),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['character', variables.characterId, 'talents', variables.specializationId],
      });
    },
  });
}

export function useImportTalents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      characterId,
      specializationId,
    }: {
      characterId: number;
      specializationId: number;
    }) => talentService.importFromBlizzard(characterId, specializationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['character', variables.characterId, 'talents', variables.specializationId],
      });
    },
  });
}
