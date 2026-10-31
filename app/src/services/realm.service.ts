import { API_VERSION } from '../config/apiConstants';
import type { Realm } from '../types/realm';
import { apiClient, getErrorStatus } from './api.client';

export interface CreateRealmPayload {
  /** Guild name (sent as `name` in the request body) */
  name: string;
  server: string;
  region: string;
  ownerId?: string | number;
}

export interface RealmSettings {
  discordGuildId?: string | null;
  discordRaidCategoryId?: string | null;
  signupLockHours?: number;
  signupReminderHours?: number;
  confirmReminderHours?: number;
  /** Fuseau IANA des messages Discord (SIMS-204). */
  timezone?: string;
}

export interface MyPermissions {
  role: string;
  permissions: Record<string, boolean>;
}

export const realmService = {
  checkUserRealm: async (): Promise<Realm | null> => {
    try {
      const { data } = await apiClient.get<Realm | { realm: null }>(`${API_VERSION}/realms/check`);
      return data && 'id' in data ? data : null;
    } catch (error) {
      if (getErrorStatus(error) === 404) return null;
      throw error;
    }
  },

  create: async (payload: CreateRealmPayload): Promise<Realm> => {
    const { data } = await apiClient.post(`${API_VERSION}/realms`, payload);
    return data;
  },

  getMyPermissions: async (realmId: number): Promise<MyPermissions> => {
    const { data } = await apiClient.get(`${API_VERSION}/realms/${realmId}/my-permissions`);
    return data;
  },

  getRealm: async (realmId: number): Promise<Realm> => {
    const { data } = await apiClient.get(`${API_VERSION}/realms/${realmId}`);
    return data;
  },

  updateSettings: async (realmId: number, settings: RealmSettings): Promise<Realm> => {
    const { data } = await apiClient.patch(`${API_VERSION}/realms/${realmId}/settings`, settings);
    return data;
  },
};
