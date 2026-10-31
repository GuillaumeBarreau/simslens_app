import { API_VERSION } from '../config/apiConstants';
import { apiClient } from './api.client';

export interface InviteCodeValidation {
  valid: boolean;
  reason?: string;
  realm?: {
    id: number;
    guildName: string;
    server: string;
    region: string;
  };
}

export interface JoinResult {
  alreadyMember: boolean;
  realm: {
    id: number;
    guildName: string;
    server: string;
    region: string;
  };
}

export interface InviteCode {
  id: number;
  realmId: number;
  code: string;
  createdBy: string;
  expiresAt: string | null;
  maxUses: number;
  useCount: number;
  createdAt: string;
}

export interface GuestCharacter {
  name: string;
  class: string;
  realm: string;
}

export interface GuestMember {
  id: number;
  realmId: number;
  userId: string;
  joinedAt: string;
  inviteCode: InviteCode | null;
  character: GuestCharacter | null;
}

export const inviteService = {
  validateCode: async (code: string): Promise<InviteCodeValidation> => {
    const { data } = await apiClient.get(`${API_VERSION}/invite/${code}`);
    return data;
  },

  joinWithCode: async (code: string): Promise<JoinResult> => {
    const { data } = await apiClient.post(`${API_VERSION}/invite/${code}/join`);
    return data;
  },

  getInviteCodes: async (realmId: number): Promise<InviteCode[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/realms/${realmId}/invites`);
    return data;
  },

  createInviteCode: async (
    realmId: number,
    options: { expiresAt?: string | null; maxUses?: number },
  ): Promise<InviteCode> => {
    const { data } = await apiClient.post(`${API_VERSION}/realms/${realmId}/invites`, options);
    return data;
  },

  deleteInviteCode: async (realmId: number, codeId: number): Promise<void> => {
    await apiClient.delete(`${API_VERSION}/realms/${realmId}/invites/${codeId}`);
  },

  getGuestMembers: async (realmId: number): Promise<GuestMember[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/realms/${realmId}/guest-members`);
    return data;
  },

  removeGuestMember: async (realmId: number, guestId: number): Promise<void> => {
    await apiClient.delete(`${API_VERSION}/realms/${realmId}/guest-members/${guestId}`);
  },
};
