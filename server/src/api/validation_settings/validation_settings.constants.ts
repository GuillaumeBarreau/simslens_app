import type { ValidationSettings } from './validation_settings.types';

/**
 * Âge (en jours) à partir duquel le dernier sim importé d'un personnage est
 * signalé comme périmé (SIMS-199).
 *
 * Défaut de la colonne `validation_settings.simStaleAfterDays` : chaque guilde
 * peut le régler entre MIN et MAX ci-dessous (SIMS-228). Le client lit la
 * valeur dans la réponse de GET /validation_settings/:realmId.
 */
export const DEFAULT_SIM_STALE_AFTER_DAYS = 7;
export const MIN_SIM_STALE_AFTER_DAYS = 1;
export const MAX_SIM_STALE_AFTER_DAYS = 60;

/**
 * Réglages appliqués tant qu'un royaume n'en a enregistré aucun.
 *
 * powerInfusion est le seul buff désactivé par défaut : il est nominatif et
 * ne profite pas à tout le raid.
 */
export const DEFAULT_SETTINGS: ValidationSettings = {
  allowedFightStyles: ['Patchwerk'],
  fightLength: 300,
  enemyCount: 1,
  raidBuffsConfig: {
    bloodlust: true,
    arcaneIntellect: true,
    fortitude: true,
    battleShout: true,
    mysticTouch: true,
    chaosBrand: true,
    skyfury: true,
    markOfTheWild: true,
    huntersMark: true,
    powerInfusion: false,
  },
  simStaleAfterDays: DEFAULT_SIM_STALE_AFTER_DAYS,
};
