import { API_VERSION } from '../config/apiConstants';
import type {
  BlizzardCharacter,
  BlizzardGuildMember,
  BlizzardImportResult,
  GuildValidatePayload,
} from '../types/blizzard.types';
import { apiClient } from './api.client';

export const blizzardService = {
  getCharacters: async (): Promise<BlizzardCharacter[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/blizzard/characters`);
    return data;
  },

  claimCharacter: async (
    name: string,
    realm: string,
    region: string = 'eu',
  ): Promise<{ success: boolean; characterId?: number; created?: boolean; updated?: boolean }> => {
    const { data } = await apiClient.post(`${API_VERSION}/blizzard/claim`, { name, realm, region });
    return data;
  },

  getGuildRoster: async (
    realm: string,
    guild: string,
    region: string = 'eu',
    realmId?: number,
  ): Promise<BlizzardGuildMember[]> => {
    // realmId : la lecture est réservée à edit_roster sur ce royaume (SIMS-126)
    const { data } = await apiClient.get(`${API_VERSION}/blizzard/guild/roster`, {
      params: { realm, guild, region, realmId },
    });
    return data;
  },

  importGuildMembers: async (
    members: BlizzardGuildMember[],
    region: string = 'eu',
    realmId?: number,
  ): Promise<BlizzardImportResult> => {
    const { data } = await apiClient.post(`${API_VERSION}/blizzard/guild/import`, {
      members,
      region,
      realmId,
    });
    return data;
  },

  validateGuild: async (
    payload: GuildValidatePayload,
  ): Promise<{ valid: boolean; message?: string }> => {
    const { data } = await apiClient.post(`${API_VERSION}/blizzard/validate-guild`, payload);
    return data;
  },
};
