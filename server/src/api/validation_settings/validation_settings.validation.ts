import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';
import {
  MAX_SIM_STALE_AFTER_DAYS,
  MIN_SIM_STALE_AFTER_DAYS,
} from './validation_settings.constants';

/** Chiffres seuls : même lecture que checkPermission (SIMS-173). */
export const realmIdParam = Joi.object({
  realmId: routeId.required(),
});

/**
 * Seuls les champs connus sont retenus. La forme des champs historiques reste
 * contrôlée par validateSettings (usecases/updateValidationSettings), qui
 * produit les messages d'erreur attendus par l'interface.
 */
export const updateSettingsBody = Joi.object({
  allowedFightStyles: Joi.any(),
  fightLength: Joi.any(),
  enemyCount: Joi.any(),
  raidBuffsConfig: Joi.any(),
  // Seuil de péremption des sims, en jours entiers (SIMS-228).
  simStaleAfterDays: Joi.number()
    .integer()
    .min(MIN_SIM_STALE_AFTER_DAYS)
    .max(MAX_SIM_STALE_AFTER_DAYS),
}).default({});
