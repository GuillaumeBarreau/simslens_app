import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

const positiveId = Joi.number().integer().positive();

/**
 * Chiffres seuls (routeId) : checkPermission rattache l'événement au royaume
 * avec la même lecture que le handler (SIMS-173).
 */
export const eventIdParam = Joi.object({
  eventId: routeId.required().messages({
    'string.base': 'Event ID must be a number',
    'string.pattern.base': 'Event ID must be a number',
    'any.required': 'Event ID is required',
  }),
});

/**
 * Seul realmId est validé ici. Les réglages de composition (poids, ratios,
 * semaines d'historique) sont normalisés par composition.options, qui les
 * ramène dans leurs bornes au lieu de rejeter la requête.
 */
export const realmScopeQuery = Joi.object({
  realmId: positiveId.required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
  historyWeeks: Joi.any().optional(),
});

/**
 * Réglages d'une génération : la liste des champs lus par
 * normalizeCompositionOptions, sans contrainte de forme pour la même raison
 * (ramenés dans leurs bornes, jamais rejetés). Le contexte pré-calculé est
 * transmis tel quel.
 */
export const generateCompositionBody = Joi.object({
  weights: Joi.any(),
  sizeOverride: Joi.any(),
  healerRatio: Joi.any(),
  historyWeeks: Joi.any(),
  selectedBossIds: Joi.any(),
  minBossesPerPlayer: Joi.any(),
  context: Joi.any(),
}).default({});
