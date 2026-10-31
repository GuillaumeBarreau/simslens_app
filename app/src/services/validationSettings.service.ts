import { API_VERSION } from '../config/apiConstants';
import api from './api';

export interface ValidationSettings {
  id?: number;
  realmId: number;
  allowedFightStyles: string[];
  fightLength: number;
  enemyCount: number;
  raidBuffsConfig: {
    bloodlust: boolean;
    arcaneIntellect: boolean;
    fortitude: boolean;
    battleShout: boolean;
    mysticTouch: boolean;
    chaosBrand: boolean;
    skyfury: boolean;
    markOfTheWild: boolean;
    huntersMark: boolean;
    powerInfusion: boolean;
  };
  isDefault?: boolean;
  /**
   * Âge en jours au-delà duquel un sim est périmé (SIMS-199), réglable par la
   * guilde entre SIM_STALE_AFTER_DAYS_MIN et SIM_STALE_AFTER_DAYS_MAX (SIMS-228).
   */
  simStaleAfterDays?: number;
}

export type ValidationSettingsUpdate = Partial<
  Omit<ValidationSettings, 'id' | 'realmId' | 'isDefault'>
>;

/** Bornes du seuil de péremption, identiques à la validation de l'API. */
export const SIM_STALE_AFTER_DAYS_MIN = 1;
export const SIM_STALE_AFTER_DAYS_MAX = 60;

export const validationSettingsService = {
  async getSettings(realmId: number): Promise<ValidationSettings> {
    const response = await api.get(`${API_VERSION}/validation_settings/${realmId}`);
    return response.data;
  },

  async updateSettings(
    realmId: number,
    settings: ValidationSettingsUpdate,
  ): Promise<ValidationSettings> {
    const response = await api.put(`${API_VERSION}/validation_settings/${realmId}`, settings);
    return response.data;
  },
};
