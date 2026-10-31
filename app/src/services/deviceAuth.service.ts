import { API_VERSION } from '../config/apiConstants';
import { apiClient } from './api.client';

export interface EligibleRealm {
  id: number;
  guildName: string;
  role: 'owner' | 'admin';
}

export interface PendingApproval {
  deviceName: string | null;
  expiresAt: string;
  eligibleRealms: EligibleRealm[];
}

export interface ApiToken {
  id: number;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export const deviceAuthService = {
  getPending: async (userCode: string): Promise<PendingApproval> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/auth/device/pending/${encodeURIComponent(userCode)}`,
    );
    return data;
  },

  approve: async (userCode: string, realmIds: number[]): Promise<{ ok: true }> => {
    const { data } = await apiClient.post(`${API_VERSION}/auth/device/approve`, {
      userCode,
      realmIds,
    });
    return data;
  },

  listTokens: async (): Promise<ApiToken[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/auth/tokens`);
    return data;
  },

  revokeToken: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_VERSION}/auth/tokens/${id}`);
  },
};
