import Joi from 'joi';

import { DUNGEON_ROLES } from '../../shared/constants/roles';

/** Créneaux stockés au format "HH:MM" (cf. schema.prisma). */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Types de donjon supportés par l'app (cf. DungeonType côté client). */
export const DUNGEON_TYPES = ['M0', 'M+'];

export const timeField = Joi.string().pattern(TIME_PATTERN).messages({
  'string.pattern.base': 'Time must use the HH:MM format',
});

/**
 * `roles` est persisté en JSON string. Le client envoie un tableau, mais
 * l'API acceptait déjà la chaîne déjà sérialisée : on conserve les deux, et
 * le tableau est sérialisé ici.
 */
export const rolesField = Joi.alternatives().try(
  Joi.array()
    .items(Joi.string().valid(...DUNGEON_ROLES))
    .min(1)
    .custom((roles: string[]) => JSON.stringify(roles)),
  Joi.string(),
);

export const availabilityIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Availability ID must be a number',
    'any.required': 'Availability ID is required',
  }),
});

export const realmScopeQuery = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
});

export const listAvailabilitiesQuery = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
  userId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

export const createAvailabilitySchema = Joi.object({
  realmId: Joi.number().integer().positive().required(),
  date: Joi.date().required(),
  startTime: timeField.required(),
  endTime: timeField.required(),
  type: Joi.string()
    .valid(...DUNGEON_TYPES)
    .required(),
  roles: rolesField.required(),
  note: Joi.string().allow('', null).optional(),
});

export const updateAvailabilitySchema = Joi.object({
  date: Joi.date().optional(),
  startTime: timeField.optional(),
  endTime: timeField.optional(),
  type: Joi.string()
    .valid(...DUNGEON_TYPES)
    .optional(),
  roles: rolesField.optional(),
  note: Joi.string().allow('', null).optional(),
}).min(1);
