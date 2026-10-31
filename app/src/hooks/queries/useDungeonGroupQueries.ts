import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  AddDungeonGroupGuestPayload,
  CreateDungeonGroupPayload,
  UpdateDungeonGroupPayload,
} from '../../services/dungeonGroup.service';
import { dungeonGroupService } from '../../services/dungeonGroup.service';

export function useDungeonGroups(realmId: number, date?: string) {
  return useQuery({
    queryKey: ['dungeonGroups', realmId, date],
    queryFn: () => dungeonGroupService.getAll(realmId, date),
    enabled: !!realmId && realmId > 0,
  });
}

/**
 * Fetch all dungeon groups for a realm within a WoW week (date range)
 */
export function useDungeonGroupsWeek(realmId: number, weekStart?: string, weekEnd?: string) {
  return useQuery({
    queryKey: ['dungeonGroups', realmId, 'week', weekStart, weekEnd],
    queryFn: () => dungeonGroupService.getAll(realmId, undefined, weekStart, weekEnd),
    enabled: !!realmId && realmId > 0 && !!weekStart && !!weekEnd,
  });
}

export function useCreateDungeonGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDungeonGroupPayload) => dungeonGroupService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useUpdateDungeonGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      realmId,
      payload,
    }: {
      id: number;
      realmId: number;
      payload: UpdateDungeonGroupPayload;
    }) => dungeonGroupService.update(id, realmId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useDeleteDungeonGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, realmId }: { id: number; realmId: number }) =>
      dungeonGroupService.delete(id, realmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useAddDungeonGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      realmId,
      userId,
      role,
    }: {
      groupId: number;
      realmId: number;
      userId: string;
      role: string;
    }) => dungeonGroupService.addMember(groupId, realmId, userId, role),
    // En cas d'échec aussi : un 404/409 signale un cache périmé (membre déjà
    // retiré ou ajouté ailleurs), le rechargement remet l'écran à jour.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useRemoveDungeonGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      realmId,
      userId,
    }: {
      groupId: number;
      realmId: number;
      userId: string;
    }) => dungeonGroupService.removeMember(groupId, realmId, userId),
    // En cas d'échec aussi : un 404/409 signale un cache périmé (membre déjà
    // retiré ou ajouté ailleurs), le rechargement remet l'écran à jour.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useAddDungeonGroupGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      realmId,
      payload,
    }: {
      groupId: number;
      realmId: number;
      payload: AddDungeonGroupGuestPayload;
    }) => dungeonGroupService.addGuest(groupId, realmId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

/**
 * Update a guest in a dungeon group (e.g. assign slotId)
 */
export function useUpdateDungeonGroupGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      realmId,
      guestId,
      payload,
    }: {
      groupId: number;
      realmId: number;
      guestId: number;
      payload: { slotId: string | null };
    }) => dungeonGroupService.updateGuest(groupId, realmId, guestId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}

export function useRemoveDungeonGroupGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      realmId,
      guestId,
    }: {
      groupId: number;
      realmId: number;
      guestId: number;
    }) => dungeonGroupService.removeGuest(groupId, realmId, guestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dungeonGroups'] });
    },
  });
}
