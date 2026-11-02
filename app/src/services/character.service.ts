import { API_CHARACTER, API_VERSION } from '../config/apiConstants';
import type { GameId } from '../config/games';
import type {
  AddOwnCharacterPayload,
  Character,
  CharacterSpecializations,
  CharacterSpecOption,
  ClassSpecializations,
  CreateCharacterPayload,
  EnchantVerifyResult,
  LatestGearResponse,
  RosterHiddenSpecWishlists,
  UpdateCharacterPayload,
  UpdateCharacterSpecializationsPayload,
  WishlistEntry,
  WishlistRecord,
  WishlistSlotAlternatives,
  WishlistStatus,
} from '../types/character.types';
import type { SimMetric } from '../utils/droptimizer';
import { apiClient } from './api.client';

export const characterService = {
  getAll: async (realmId?: number): Promise<Character[]> => {
    const { data } = await apiClient.get(`${API_VERSION}${API_CHARACTER}`, {
      params: { ...(realmId ? { realmId } : {}) },
    });
    return data;
  },

  getWishlist: async (characterId: number, specializationId: number): Promise<WishlistRecord> => {
    const { data } = await apiClient.get(`${API_VERSION}/characters/${characterId}/wishlist`, {
      params: { specializationId },
    });
    return data;
  },

  /** Vœux déjà portés ou battus par l'équipement actuel (SIMS-205). */
  getWishlistStatus: async (
    characterId: number,
    params: { specializationId: number; difficulty: string },
  ): Promise<WishlistStatus> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/characters/${characterId}/wishlist/status`,
      { params },
    );
    return data;
  },

  /** Objets de raid du même emplacement, avec gain simulé et boss (SIMS-205). */
  getWishlistSlotAlternatives: async (
    characterId: number,
    slot: string,
    params: { specializationId: number; difficulty: string; extension: string; season: string },
  ): Promise<WishlistSlotAlternatives> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/characters/${characterId}/wishlist/${slot}/alternatives`,
      { params },
    );
    return data;
  },

  getCharacterSpecs: async (characterId: number): Promise<CharacterSpecOption[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/characters/${characterId}/wishlist/specs`);
    return data;
  },

  getRoster: async (difficulty?: string, realmId?: number): Promise<Character[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/roster`, {
      params: { ...(difficulty ? { difficulty } : {}), ...(realmId ? { realmId } : {}) },
    });
    return data;
  },

  getPending: async (difficulty: string = 'heroic', realmId?: number): Promise<Character[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/pending`, {
      params: { difficulty, ...(realmId ? { realmId } : {}) },
    });
    return data;
  },

  getRosterWishlists: async (region: string, realm: string) => {
    const { data } = await apiClient.get(`${API_VERSION}/roster/${region}/${realm}`);
    return data;
  },

  getRosterHiddenSpecWishlists: async (
    region: string,
    realm: string,
  ): Promise<RosterHiddenSpecWishlists[]> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/roster/${region}/${realm}/wishlist-hidden-specs`,
    );
    return data;
  },

  /** Avec `game`, seules les classes et spés de ce jeu, avec leur `label` (SIMS-027). */
  getClassSpecializations: async (game?: GameId): Promise<ClassSpecializations[]> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/classes/specializations`, {
      ...(game ? { params: { game } } : {}),
    });
    return data;
  },

  /** Le joueur ajoute son personnage dans une guilde WoW Forever (SIMS-050). */
  addOwn: async (payload: AddOwnCharacterPayload): Promise<Character> => {
    const { data } = await apiClient.post(`${API_VERSION}/character/own`, payload);
    return data;
  },

  getSpecializations: async (characterId: number): Promise<CharacterSpecializations> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/${characterId}/specializations`);
    return data;
  },

  updateSpecializations: async (
    characterId: number,
    payload: UpdateCharacterSpecializationsPayload,
  ): Promise<CharacterSpecializations> => {
    const { data } = await apiClient.put(
      `${API_VERSION}/character/${characterId}/specializations`,
      payload,
    );
    return data;
  },

  getRosterWishlistCompletion: async (
    region: string,
    realm: string,
  ): Promise<Record<number, number>> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/roster/${region}/${realm}/wishlist-completion`,
    );
    return data;
  },

  copyWishlistFrom: async (
    characterId: number,
    targetSpecializationId: number,
    sourceId: number,
    sourceSpecializationId: number,
  ): Promise<WishlistEntry[]> => {
    const { data } = await apiClient.post(
      `${API_VERSION}/characters/${characterId}/wishlist/copy-from/${sourceId}`,
      { targetSpecializationId, sourceSpecializationId },
    );
    return data;
  },

  updateWishlistItem: async (
    characterId: number,
    specializationId: number,
    slot: string,
    itemId: number | null,
    priority?: number,
  ): Promise<WishlistEntry> => {
    const { data } = await apiClient.put(
      `${API_VERSION}/characters/${characterId}/wishlist/${slot}`,
      { itemId, priority, specializationId },
    );
    return data;
  },

  create: async (payload: CreateCharacterPayload): Promise<Character> => {
    const { data } = await apiClient.post(`${API_VERSION}/character`, payload);
    return data;
  },

  update: async (characterId: number, payload: UpdateCharacterPayload): Promise<Character> => {
    const { data } = await apiClient.post(`${API_VERSION}/character/${characterId}`, payload);
    return data;
  },

  delete: async (characterId: number, realmId?: number): Promise<{ success: boolean }> => {
    const { data } = await apiClient.delete(`${API_VERSION}/character/${characterId}`, {
      params: { realmId },
    });
    return data;
  },

  /** Dernier relevé d'équipement avec le détail des objets. */
  getLatestGear: async (characterId: number): Promise<LatestGearResponse> => {
    const { data } = await apiClient.get(`${API_VERSION}/character/${characterId}/gear/latest`);
    return data;
  },

  /** Enchantements et gemmes de l'équipement porté : manquants, invalides, rang. */
  verifyEnchantments: async (characterId: number): Promise<EnchantVerifyResult> => {
    const { data } = await apiClient.get(`${API_VERSION}/enchantments/verify/${characterId}`);
    return data;
  },

  getBossUpgrades: async (
    characterId: number,
    params: {
      difficulty: string;
      extension: string;
      season: string;
      specializationId?: number | null;
    },
  ): Promise<CharacterBossUpgrades> => {
    const { data } = await apiClient.get(
      `${API_VERSION}/upgrade/by-boss/character/${characterId}`,
      {
        params: {
          difficulty: params.difficulty,
          extension: params.extension,
          season: params.season,
          ...(params.specializationId ? { specializationId: params.specializationId } : {}),
        },
      },
    );
    return data;
  },
};

export interface CharacterBossUpgradeItem {
  id: number;
  name: string;
  icon: string;
  quality: number;
  itemLevel: number;
  inventoryType: number | null;
  isToken: boolean;
  rewardItem: {
    id: number;
    name: string;
    icon: string;
    quality: number;
    itemLevel: number;
    inventoryType: number | null;
    slot: string | null;
  } | null;
  dps: number | null;
  baseDps: number | null;
  dpsGain: number | null;
  gainPercent: number | null;
  hasSimData: boolean;
  isUpgrade: boolean;
  isBiS: boolean;
  isWishlist: boolean;
  reportId: string | null;
  spec: string | null;
  /** Grandeur de la sim (SIMS-202) : `hps` pour QE Live ; null sans sim. */
  metric?: SimMetric | null;
  timeStamp: string | null;
}

export interface CharacterBossUpgrade {
  boss: {
    id: number;
    name: string;
    icon: string | null;
    order: number;
    raidName: string | null;
    extension: string;
    season: string;
  };
  items: CharacterBossUpgradeItem[];
  stats: {
    totalItems: number;
    simmedItems: number;
    upgradesCount: number;
    highlightedCount: number;
    bestGain: number;
    expectedGain: number;
    upgradeChance: number;
    /** Grandeur de bestGain / expectedGain (SIMS-202). */
    metric?: SimMetric | null;
  };
}

/** Spé d'une sim, telle que la vue par boss la décrit. */
export interface SimSpecialization {
  id: number;
  name: string;
  icon: string | null;
  role: string | null;
}

/**
 * Vue par boss d'un personnage pour une seule spé (SIMS-211) : la spé retenue
 * (demandée, sinon la principale) et les spés qui ont des sims.
 */
export interface CharacterBossUpgrades {
  specializationId: number | null;
  specialization: SimSpecialization | null;
  specializations: SimSpecialization[];
  /**
   * Grandeur des gains de la spé retenue (SIMS-202) : `hps` pour une sim QE
   * Live de soigneur ; null sans sim.
   */
  metric?: SimMetric | null;
  bosses: CharacterBossUpgrade[];
}
