import { API_VERSION } from '../config/apiConstants';
import type { SelectedNodes, TalentLoadout, TalentTreeData } from '../types/talent.types';
import { apiClient } from './api.client';

export const talentService = {
  getTree: async (characterId: number, specializationId: number): Promise<TalentTreeData> => {
    const { data } = await apiClient.get(`${API_VERSION}/characters/${characterId}/talent-tree`, {
      params: { specId: specializationId },
    });
    return data;
  },

  getLoadout: async (characterId: number, specializationId: number): Promise<TalentLoadout> => {
    const { data } = await apiClient.get(`${API_VERSION}/characters/${characterId}/talents`, {
      params: { specId: specializationId },
    });
    return data;
  },

  saveLoadout: async (
    characterId: number,
    specializationId: number,
    selectedNodes: SelectedNodes,
    exportString?: string | null,
    label?: string | null,
  ): Promise<{ success: boolean; updatedAt: string | null }> => {
    const { data } = await apiClient.put(`${API_VERSION}/characters/${characterId}/talents`, {
      specializationId,
      selectedNodes,
      exportString,
      label,
    });
    return data;
  },

  importFromBlizzard: async (
    characterId: number,
    specializationId: number,
  ): Promise<{ success: boolean; selectedNodes: SelectedNodes; exportString: string | null }> => {
    const { data } = await apiClient.post(
      `${API_VERSION}/characters/${characterId}/talents/import`,
      { specializationId },
    );
    return data;
  },
};
