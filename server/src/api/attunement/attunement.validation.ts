import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';
import { ATTUNEMENT_KEYS } from './attunement.definitions';
import { FACTIONS } from './attunement.types';

export const realmQuery = Joi.object({
  realmId: routeId.required(),
});

/** :characterId en chiffres seuls : checkPermission le rattache au royaume. */
export const characterAttunementParam = Joi.object({
  characterId: routeId.required(),
  attunement: Joi.string()
    .valid(...ATTUNEMENT_KEYS)
    .required(),
});

export const saveAttunementSchema = Joi.object({
  faction: Joi.string()
    .valid(...FACTIONS)
    .required(),
  // Borne fine selon la chaîne de la faction : dans le usecase.
  completedSteps: Joi.number().integer().min(0).max(100).required(),
});
