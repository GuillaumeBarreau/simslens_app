import { apiClient } from './api.client';

/** Contrat de l'API des attunements (SIMS-029, `server/src/api/attunement`). */
export type Faction = 'alliance' | 'horde';

export interface AttunementStep {
  questId: number;
  name: string;
}

export interface AttunementDefinition {
  key: string;
  raid: string;
  itemId: number;
  chains: Record<Faction, AttunementStep[]>;
}

export interface AttunementStatus {
  attunement: string;
  faction: Faction | null;
  completedSteps: number;
  totalSteps: number | null;
  completed: boolean;
  nextStep: AttunementStep | null;
}

export interface CharacterAttunements {
  characterId: number;
  name: string;
  class: string;
  attunements: AttunementStatus[];
}

export interface SaveAttunementPayload {
  characterId: number;
  attunement: string;
  faction: Faction;
  completedSteps: number;
}

export const attunementService = {
  async getDefinitions(): Promise<AttunementDefinition[]> {
    const { data } = await apiClient.get('/1/attunements/definitions');
    return data.attunements;
  },

  async getRealmAttunements(realmId: number): Promise<CharacterAttunements[]> {
    const { data } = await apiClient.get('/1/attunements', { params: { realmId } });
    return data.characters;
  },

  async save({
    characterId,
    attunement,
    faction,
    completedSteps,
  }: SaveAttunementPayload): Promise<AttunementStatus> {
    const { data } = await apiClient.put(`/1/attunements/characters/${characterId}/${attunement}`, {
      faction,
      completedSteps,
    });
    return data;
  },
};
