import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { GameId } from 'config/games';
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
