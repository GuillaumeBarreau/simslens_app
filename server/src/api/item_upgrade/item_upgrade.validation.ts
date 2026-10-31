import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

export const positiveId = Joi.number().integer().positive();

/**
 * La difficulté est volontairement validée comme une chaîne non vide et non
 * comme une énumération : sa casse varie selon les tables (voir
 * raid_difficulties) et restreindre les valeurs ici refuserait des requêtes
 * aujourd'hui acceptées.
 */
export const difficultyField = Joi.string().trim().min(1);

export const realmScopeQuery = Joi.object({
  realmId: positiveId.optional(),
});

/** Écriture cloisonnée : le royaume est obligatoire. */
export const realmRequiredQuery = Joi.object({
  realmId: positiveId.required(),
});

export const itemDifficultyParam = Joi.object({
  itemID: positiveId.required(),
  difficulty: difficultyField.required(),
});

export const nameItemDifficultyParam = itemDifficultyParam.keys({
  name: Joi.string().trim().min(1).required(),
});

/**
 * Chiffres seuls (routeId) : la route n'a pas encore de garde, mais un
 * checkPermission lirait :characterId sans conversion Joi (SIMS-171).
 */
export const characterIdParam = Joi.object({
  characterId: routeId.required(),
});

export const batchSchema = Joi.object({
  itemIds: Joi.array().items(positiveId).min(1).required().messages({
    'any.required': 'itemIds array is required',
    'array.base': 'itemIds array is required',
    'array.min': 'itemIds array is required',
  }),
  difficulty: difficultyField.required().messages({
    'any.required': 'difficulty is required',
    'string.empty': 'difficulty is required',
  }),
  realmId: positiveId.allow(null).optional(),
});

export const bossUpgradesQuery = Joi.object({
  difficulty: difficultyField.required().messages({
    'any.required': 'difficulty, extension and season query params are required',
  }),
  extension: Joi.string().trim().min(1).required().messages({
    'any.required': 'difficulty, extension and season query params are required',
  }),
  season: Joi.string().trim().min(1).required().messages({
    'any.required': 'difficulty, extension and season query params are required',
  }),
  specializationId: positiveId.optional(),
});
