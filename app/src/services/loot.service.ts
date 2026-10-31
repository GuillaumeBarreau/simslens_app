import { API_VERSION } from '../config/apiConstants';
import type { CreateLootPayload, InstanceLoot, LootFilters } from '../types/loot.types';
import { apiClient } from './api.client';

export const lootService = {
  getAll: async (
    instanceId: number,
    filters?: LootFilters,
    realmId?: number,
  ): Promise<InstanceLoot[]> => {
    const params = new URLSearchParams({ instanceId: String(instanceId) });
    if (filters?.bossId) params.append('bossId', String(filters.bossId));
    if (filters?.assignedTo !== undefined) {
      params.append(
        'assignedTo',
        filters.assignedTo === null ? 'null' : String(filters.assignedTo),
      );
    }
    if (realmId) params.append('realmId', String(realmId));
    const { data } = await apiClient.get(`${API_VERSION}/loots?${params.toString()}`);
    return data;
  },

  getOne: async (id: number | string): Promise<InstanceLoot> => {
    const { data } = await apiClient.get(`${API_VERSION}/loots/${id}`);
    return data;
  },

  create: async (payload: CreateLootPayload): Promise<InstanceLoot> => {
    const { data } = await apiClient.post(`${API_VERSION}/loots`, payload);
    return data;
  },

  assign: async (
    lootId: number,
    assignedTo: number,
    assignedBy?: number,
  ): Promise<InstanceLoot> => {
    const { data } = await apiClient.patch(`${API_VERSION}/loots/${lootId}`, {
      assignedTo,
      assignedBy,
    });
    return data;
  },

  remove: async (lootId: number): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete(`${API_VERSION}/loots/${lootId}`);
    return data;
  },
};
