import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

export const positiveId = Joi.number().integer().positive();

/**
 * Chiffres seuls (routeId) : checkPermission rattache le personnage au
 * royaume avec la même lecture que le handler.
 */
export const characterIdParam = Joi.object({
  characterId: routeId.required().messages({
    'string.base': 'characterId is required',
    'string.pattern.base': 'characterId is required',
    'any.required': 'characterId is required',
  }),
});

/**
 * Les bornes de dates restent optionnelles : le service applique une fenêtre
 * par défaut (30 derniers jours) et contrôle l'amplitude maximale.
 */
export const attendanceQuery = Joi.object({
  realmId: positiveId.required().messages({
    'number.base': 'realmId is required',
    'any.required': 'realmId is required',
  }),
  startDate: Joi.date().optional().messages({
    'date.base': 'Invalid date',
  }),
  endDate: Joi.date().optional().messages({
    'date.base': 'Invalid date',
  }),
  includeOptional: Joi.boolean().truthy('1').falsy('0').optional().default(false),
});
