import { notifications } from '@mantine/notifications';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AssignToRosterPayload,
  CompositionContext,
  CompositionResult,
  EventRosterResponse,
  GenerateCompositionPayload,
  PoolCharacter,
  RosterAssignment,
  RosterVacancy,
} from '../../services/roster.service';
import { rosterService } from '../../services/roster.service';

export function useEventRoster(eventId: number | null, realmId: number, bossId?: number | null) {
  return useQuery({
    queryKey: ['event-roster', eventId, realmId, bossId],
    queryFn: () => rosterService.getRoster(eventId!, realmId, bossId),
    enabled: !!eventId && !!realmId,
    refetchInterval: 3000,
  });
}

/**
 * Hook to fetch available pool (signed up but not assigned)
 */
export function useRosterPool(eventId: number | null, realmId: number, bossId?: number | null) {
  return useQuery({
    queryKey: ['roster-pool', eventId, realmId, bossId],
    queryFn: () => rosterService.getPool(eventId!, realmId, bossId),
    enabled: !!eventId && !!realmId,
    refetchInterval: 3000,
  });
}

export function useAssignToRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      realmId,
      payload,
    }: {
      eventId: number;
      realmId: number;
      payload: AssignToRosterPayload;
      character?: PoolCharacter;
    }) => rosterService.assign(eventId, realmId, payload),

    onMutate: async (variables) => {
      const { eventId, realmId, payload, character } = variables;
      const bossId = payload.bossId ?? null;
      const queryKey = ['event-roster', eventId, realmId, bossId];

      await queryClient.cancelQueries({ queryKey });

      const previousRoster = queryClient.getQueryData(queryKey);

      if (previousRoster && character) {
        queryClient.setQueryData<EventRosterResponse>(queryKey, (old) => {
          if (!old) return old;

          let listName: 'tanks' | 'healers' | 'melee' | 'ranged' = 'melee';
          const role = payload.role.toUpperCase();
          if (role === 'TANK') listName = 'tanks';
          else if (role === 'HEALER') listName = 'healers';
          else if (role === 'MELEE') listName = 'melee';
          else if (role === 'RANGED') listName = 'ranged';

          const newAssignment: RosterAssignment = {
            id: -Date.now(), // Temporary ID
            eventId,
            characterId: payload.characterId,
            role: payload.role,
            bossId,
            position: old[listName].length,
            character: { ...character, userId: character.userId ?? undefined },
          };

          return {
            ...old,
            [listName]: [...old[listName], newAssignment],
            counts: {
              ...old.counts,
              [listName]: old.counts[listName] + 1,
              total: old.counts.total + 1,
            },
          };
        });
      }

      return { previousRoster };
    },

    onError: (_err, variables, context) => {
      const bossId = variables.payload.bossId ?? null;
      queryClient.setQueryData(
        ['event-roster', variables.eventId, variables.realmId, bossId],
        context?.previousRoster,
      );
    },

    onSettled: (_, __, variables) => {
      const bossId = variables.payload.bossId ?? null;
      queryClient.invalidateQueries({
        queryKey: ['event-roster', variables.eventId, variables.realmId, bossId],
      });
      queryClient.invalidateQueries({ queryKey: ['roster-pool'] });
    },
  });
}

export function useRemoveFromRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      characterId,
      realmId,
      bossId,
    }: {
      eventId: number;
      characterId: number;
      realmId: number;
      bossId?: number | null;
    }) => rosterService.remove(eventId, characterId, realmId, bossId),

    onMutate: async (variables) => {
      const { eventId, realmId, bossId, characterId } = variables;
      const queryKey = ['event-roster', eventId, realmId, bossId ?? null];

      await queryClient.cancelQueries({ queryKey });
      const previousRoster = queryClient.getQueryData(queryKey);

      if (previousRoster) {
        queryClient.setQueryData<EventRosterResponse>(queryKey, (old) => {
          if (!old) return old;

          const roleKeys = ['tanks', 'healers', 'melee', 'ranged'] as const;
          let removedRole: (typeof roleKeys)[number] | null = null;
          const newRoster: EventRosterResponse = { ...old };

          roleKeys.forEach((role) => {
            const list = old[role];
            const index = list.findIndex((a) => a.characterId === characterId);
            if (index !== -1) {
              removedRole = role;
              newRoster[role] = list.filter((a) => a.characterId !== characterId);
            }
          });

          if (removedRole) {
            newRoster.counts = {
              ...old.counts,
              [removedRole]: Math.max(0, old.counts[removedRole] - 1),
              total: Math.max(0, old.counts.total - 1),
            };
          }

          return newRoster;
        });
      }

      return { previousRoster };
    },

    onError: (_err, variables, context) => {
      queryClient.setQueryData(
        ['event-roster', variables.eventId, variables.realmId, variables.bossId ?? null],
        context?.previousRoster,
      );
    },

    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-roster', variables.eventId, variables.realmId, variables.bossId ?? null],
      });
      queryClient.invalidateQueries({ queryKey: ['roster-pool'] });
    },
  });
}

export function useReorderRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      realmId,
      bossId,
      role,
      characterIds,
    }: {
      eventId: number;
      realmId: number;
      bossId: number;
      role: 'TANK' | 'HEALER' | 'MELEE' | 'RANGED';
      characterIds: number[];
    }) => rosterService.reorderRoster(eventId, realmId, bossId, role, characterIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['event-roster', variables.eventId],
      });
    },
  });
}

export function useCopyRoster(eventId: number, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sourceBossId,
      targetBossIds,
    }: {
      sourceBossId: number;
      targetBossIds: number[];
    }) => rosterService.copyRoster(eventId, realmId, sourceBossId, targetBossIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-roster', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-pool', eventId] });
      notifications.show({
        title: 'Success',
        message: 'Roster copied successfully',
        color: 'green',
      });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to copy roster',
        color: 'red',
      });
    },
  });
}

export function useClearBossRoster(eventId: number, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bossId: number) => rosterService.clearBossRoster(eventId, realmId, bossId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-roster', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-pool', eventId] });
      notifications.show({
        title: 'Success',
        message: 'Roster cleared successfully',
        color: 'green',
      });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.error || 'Failed to clear roster',
        color: 'red',
      });
    },
  });
}

/**
 * Hook to fetch past events with their roster composition (for import picker)
 */
export function usePastRosters(eventId: number | null, realmId: number) {
  return useQuery({
    queryKey: ['past-rosters', eventId, realmId],
    queryFn: () => rosterService.getPastRosters(eventId as number, realmId),
    enabled: !!eventId && !!realmId,
    staleTime: 30_000,
  });
}

/**
 * Hook to fetch the composition context (rich JSON snapshot used to drive
 * the algorithm or be sent to a LLM).
 */
export function useCompositionContext(
  eventId: number | null,
  realmId: number,
  enabled: boolean,
  historyWeeks?: number,
) {
  return useQuery<CompositionContext>({
    queryKey: ['composition-context', eventId, realmId, historyWeeks ?? 6],
    queryFn: () => rosterService.getCompositionContext(eventId as number, realmId, historyWeeks),
    enabled: !!eventId && !!realmId && enabled,
    staleTime: 60_000,
  });
}

/**
 * Hook to generate an automatic composition proposal.
 * Returns a proposal — applying it is a separate step (useApplyComposition).
 */
export function useGenerateComposition(eventId: number | null, realmId: number) {
  return useMutation<CompositionResult, unknown, GenerateCompositionPayload>({
    mutationFn: (payload) => rosterService.generateComposition(eventId as number, realmId, payload),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.error || 'Échec de la génération',
        color: 'red',
      });
    },
  });
}

/**
 * Hook to apply a generated composition: clears the bosses involved then
 * re-creates the assignments from the proposal.
 */
export function useApplyComposition(eventId: number | null, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: CompositionResult) => {
      const targetEventId = eventId as number;
      const bossesToClear = proposal.bosses.filter((b) => b.assignments.length > 0);

      for (const b of bossesToClear) {
        await rosterService.clearBossRoster(targetEventId, realmId, b.boss.id);
      }

      let assigned = 0;
      let failed = 0;
      for (const bossResult of bossesToClear) {
        for (const a of bossResult.assignments) {
          try {
            await rosterService.assign(targetEventId, realmId, {
              characterId: a.characterId,
              role: a.role,
              bossId: bossResult.boss.id,
              position: a.position,
            });
            assigned += 1;
          } catch {
            failed += 1;
          }
        }
      }
      return { assigned, failed, bosses: bossesToClear.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['event-roster', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-pool', eventId] });
      notifications.show({
        title: 'Composition appliquée',
        message: `${result.assigned} assignation(s) sur ${result.bosses} boss${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}`,
        color: result.failed > 0 ? 'yellow' : 'green',
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } };
      notifications.show({
        title: 'Erreur',
        message: err.response?.data?.error || "Échec de l'application",
        color: 'red',
      });
    },
  });
}

/**
 * Places libérées par un désistement et leurs remplaçants (SIMS-142).
 *
 * Le calcul lit les améliorations de chaque candidat : il n'est pas
 * interrogé à intervalle régulier. `rosterSignature` résume le vivier et les
 * placements, déjà rafraîchis en continu : un membre qui passe absent, ou
 * une place pourvue à la main, change la signature et relance le calcul une
 * seule fois. Il l'est aussi après chaque remplacement.
 */
export function useRosterReplacements(
  eventId: number | null,
  realmId: number,
  rosterSignature: string,
  enabled: boolean,
) {
  return useQuery<RosterVacancy[]>({
    queryKey: ['roster-replacements', eventId, realmId, rosterSignature],
    queryFn: () => rosterService.getReplacements(eventId as number, realmId),
    enabled: !!eventId && !!realmId && enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Remplace en un clic un titulaire désisté : place le remplaçant sur le même
 * boss et le même rôle, puis retire le titulaire. Dans cet ordre, un échec
 * laisse au pire les deux personnages placés, jamais une place vide.
 */
export function useReplaceRosterHolder(eventId: number | null, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      vacancy,
      replacementId,
    }: {
      vacancy: RosterVacancy;
      replacementId: number;
    }) => {
      const targetEventId = eventId as number;
      const assignment = await rosterService.assign(targetEventId, realmId, {
        characterId: replacementId,
        role: vacancy.role,
        bossId: vacancy.bossId,
      });
      await rosterService.remove(targetEventId, vacancy.characterId, realmId, vacancy.bossId);
      return assignment;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['event-roster', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-pool', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-replacements', eventId] });
    },
  });
}

export function useImportRosterFromEvent(eventId: number, realmId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sourceEventId: number) =>
      rosterService.importRosterFromEvent(eventId, realmId, sourceEventId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['event-roster', eventId] });
      queryClient.invalidateQueries({ queryKey: ['roster-pool', eventId] });
      notifications.show({
        title: 'Composition importée',
        message: `${result.imported} joueur(s) importé(s)${result.skipped > 0 ? `, ${result.skipped} ignoré(s)` : ''}`,
        color: 'green',
      });
    },
    onError: (error: { response?: { data?: { error?: string } } }) => {
      notifications.show({
        title: 'Erreur',
        message: error.response?.data?.error || "Échec de l'import",
        color: 'red',
      });
    },
  });
}
