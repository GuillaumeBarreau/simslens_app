import { API_VERSION } from '../config/apiConstants';
import type { GearSnapshot } from '../types/character.types';
import { apiClient } from './api.client';

export interface ImportedLootRow {
  id: number;
  importID?: number;
  characterID?: number;
  date?: string;
  time?: string;
  itemID?: number;
  response?: string;
  instance?: string;
  owner?: number;
  itemName?: string;
  itemIcon?: string;
}

export interface EnchantCheck {
  slot: string;
  isValid: boolean | null;
  reason: string;
}

export interface CharacterEnchantChecks {
  results: Array<EnchantCheck & { craftingQuality?: number | null }>;
  gems: Array<EnchantCheck & { rank: number | null }>;
  hasEpicGem: boolean;
}

export const trackingService = {
  getImportedLoots: async (realmId: number): Promise<ImportedLootRow[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/import/loots/bulk`, {
      params: { all: 1, realmId },
    });
    return data?.rows ?? [];
  },

  getGearSnapshots: async (ids: number[]): Promise<Record<number, GearSnapshot | null>> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/gear/bulk`, {
      params: { ids: ids.join(',') },
    });
    return data.snapshots;
  },

  getEnchantChecks: async (
    ids: number[],
  ): Promise<Record<number, CharacterEnchantChecks | null>> => {
    const { data } = await apiClient.get(`${API_VERSION}/enchantments/verify/bulk`, {
      params: { ids: ids.join(',') },
    });
    return data;
  },

  refreshRoster: async (realmId: number) => {
    const { data } = await apiClient.post(`${API_VERSION}/character/update-all`, { realmId });
    return data;
  },

  clearUpgrades: async (realmId: number) => {
    const { data } = await apiClient.delete(`${API_VERSION}/upgrade`, { params: { realmId } });
    return data;
  },
};
