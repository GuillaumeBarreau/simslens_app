import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { GameId } from 'config/games';
import { useCallback } from 'react';
import {
  type CreateRealmPayload,
  realmService,
  type RegionWithServers,
} from 'services/realm.service';
import type { Realm } from 'types/realm';

export function useUserRealm(
  ownerId?: string | null,
  options?: Omit<UseQueryOptions<Realm | null>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<Realm | null>({
    queryKey: ['realm', 'check', ownerId],
    queryFn: async () => {
      if (!ownerId) return null;
      return realmService.checkUserRealm();
    },
    retry: false,
    enabled: Boolean(ownerId) && options?.enabled !== false,
    ...options,
  });
}

export function useMyRealmPermissions(realmId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['realm', realmId, 'permissions'],
    queryFn: () => realmService.getMyPermissions(realmId!),
    enabled: enabled && realmId !== undefined,
    retry: false,
  });
}

const REALM_LIST_KEY = ['realm', 'list'] as const;

/**
 * Charge à la demande la liste des guildes (avec leur jeu), mise en cache 5 min :
 * le sélecteur de jeu n'en a besoin qu'au moment où l'on change de jeu.
 */
export function useFetchRealmList() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.fetchQuery<Realm[]>({
        queryKey: REALM_LIST_KEY,
        queryFn: () => realmService.list(),
        staleTime: 5 * 60 * 1000,
      }),
    [queryClient],
  );
}

/** Régions et serveurs d'un jeu (Retail par défaut). */
export function useRegions(game: GameId = 'retail') {
  return useQuery<RegionWithServers[]>({
    queryKey: ['regions', game],
    queryFn: () => realmService.getRegions(game),
  });
}

/** Crée une guilde ; le royaume du compte (`['realm']`) est rechargé ensuite. */
export function useCreateRealm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRealmPayload) => realmService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['realm'] }),
  });
}
