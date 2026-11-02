import { API_VERSION } from '../config/apiConstants';
import { apiClient } from './api.client';

/** Origine de la liste retenue : celle de la guilde ou la référence SimsLens. */
export type BisSource = 'guild' | 'curated';

export interface BisItem {
  itemId: number;
  note: string | null;
}

/** Liste retenue pour un emplacement (SIMS-030) ; vide si aucune liste n'existe. */
export interface BisSlot {
  slot: string;
  source: BisSource | null;
  /** Palier de la liste retenue : un palier antérieur si le courant n'en a pas. */
  season: string | null;
  /** Dans l'ordre : le premier est le BiS. */
  items: BisItem[];
}

export interface BisList {
  specializationId: number;
  season: string;
  slots: BisSlot[];
}

export interface BisScope {
  realmId: number;
  specializationId: number;
  season: string;
}

export interface SaveBisSlotPayload {
  specializationId: number;
  season: string;
  /** Au plus 5, l'ordre donne le rang ; vide = retour à la référence. */
  items: { itemId: number; note?: string | null }[];
}

export const bisService = {
  get: async ({ realmId, specializationId, season }: BisScope): Promise<BisList> => {
    const { data } = await apiClient.get(`${API_VERSION}/bis`, {
      params: { realmId, specializationId, season },
    });
    return data;
  },

  saveSlot: async (realmId: number, slot: string, payload: SaveBisSlotPayload): Promise<void> => {
    await apiClient.put(`${API_VERSION}/bis/slots/${slot}`, payload, { params: { realmId } });
  },
};
