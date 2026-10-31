import { API_ITEM, API_VERSION } from '../config/apiConstants';
import type { Item } from '../types/loot.types';
import type { Boss, Instance, RaidWithDifficulties } from '../types/raid';
import { apiClient } from './api.client';

export interface CreateInstancePayload {
  name: string;
  date: string;
  raidDifficultyId?: number | string | null;
  realmId?: number;
}

export const raidService = {
  getAllRaids: async (): Promise<RaidWithDifficulties[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/raids`);
    return data;
  },

  getAllBosses: async (): Promise<Boss[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/bosses`);
    return data;
  },

  getBossesByRaid: async (extension: string, season: string): Promise<Boss[]> => {
    const params = new URLSearchParams();
    if (extension) params.append('extension', extension);
    if (season) params.append('season', season);
    const { data } = await apiClient.get(`${API_VERSION}/raids/bosses?${params.toString()}`);
    return data;
  },

  getAllInstances: async (realmId?: number): Promise<Instance[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/instance`, {
      params: realmId ? { realmId } : {},
    });
    return data;
  },

  createInstance: async (payload: CreateInstancePayload): Promise<Instance> => {
    const { data } = await apiClient.post(`${API_VERSION}/instance`, payload);
    return data;
  },

  getInstanceBosses: async (instanceId: number, realmId?: number): Promise<Boss[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/instances/${instanceId}/bosses`, {
      params: realmId ? { realmId } : {},
    });
    return data;
  },

  getItem: async (id: number | string): Promise<Item> => {
    const { data } = await apiClient.get(`${API_VERSION}${API_ITEM}${id}`);
    return data;
  },

  getAvailableItems: async (
    extension: string,
    season: string,
    slot: string,
    classId?: number | null,
    specName?: string | null,
  ): Promise<Item[]> => {
    const params = new URLSearchParams();
    if (classId) params.append('classId', String(classId));
    if (specName) params.append('specName', specName);
    const qs = params.toString();
    const url = `${API_VERSION}/extensions/${extension}/seasons/${season}/items/${slot}${qs ? `?${qs}` : ''}`;
    const { data } = await apiClient.get(url);
    return data;
  },
};
