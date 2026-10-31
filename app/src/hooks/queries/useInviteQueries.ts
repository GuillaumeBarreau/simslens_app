import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inviteService } from 'services/invite.service';

const inviteCodesKey = (realmId?: number | null) => ['inviteCodes', realmId];
const guestMembersKey = (realmId?: number | null) => ['guestMembers', realmId];

export function useInviteCodes(realmId?: number | null) {
  return useQuery({
    queryKey: inviteCodesKey(realmId),
    queryFn: () => inviteService.getInviteCodes(realmId as number),
    enabled: Boolean(realmId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useGuestMembers(realmId?: number | null) {
  return useQuery({
    queryKey: guestMembersKey(realmId),
    queryFn: () => inviteService.getGuestMembers(realmId as number),
    enabled: Boolean(realmId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateInviteCode(realmId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options: { expiresAt: string | null; maxUses: number }) =>
      inviteService.createInviteCode(realmId as number, options),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteCodesKey(realmId) }),
  });
}

export function useDeleteInviteCode(realmId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: number) => inviteService.deleteInviteCode(realmId as number, codeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteCodesKey(realmId) }),
  });
}

export function useRemoveGuestMember(realmId?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guestId: number) => inviteService.removeGuestMember(realmId as number, guestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: guestMembersKey(realmId) }),
  });
}
