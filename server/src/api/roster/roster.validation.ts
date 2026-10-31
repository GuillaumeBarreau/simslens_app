import Joi from 'joi';

import { RAID_ROLES } from '../../shared/constants/roles';

export const positiveId = Joi.number().integer().positive();

export const eventIdParam = Joi.object({
  eventId: positiveId.required().messages({
    'number.base': 'Event ID must be a number',
    'any.required': 'Event ID is required',
  }),
});

export const eventCharacterParam = eventIdParam.keys({
  characterId: positiveId.required(),
});

export const eventBossParam = eventIdParam.keys({
  bossId: positiveId.required(),
});

export const realmScopeQuery = Joi.object({
  realmId: positiveId.required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
});

/**
 * Portée royaume + bossId optionnel, pour les routes dont le handler lit
 * bossId dans la query (consultation du roster, du pool, désassignation).
 * Sans cette clé déclarée, stripUnknown supprimerait le paramètre.
 */
export const realmScopeWithBossQuery = realmScopeQuery.keys({
  bossId: positiveId.optional(),
});

export const roleField = Joi.string()
  .valid(...RAID_ROLES)
  .messages({
    'any.only': `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
  });

export const assignSchema = Joi.object({
  characterId: positiveId.required().messages({
    'any.required': 'characterId and role are required',
  }),
  role: roleField.required().messages({
    'any.required': 'characterId and role are required',
    'any.only': `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
  }),
  bossId: positiveId.required().messages({
    'any.required': 'bossId is required',
  }),
  position: positiveId.allow(0).optional().default(0),
});

export const reorderSchema = Joi.object({
  bossId: positiveId.required().messages({
    'any.required': 'bossId, role, and characterIds array are required',
  }),
  role: roleField.required().messages({
    'any.required': 'bossId, role, and characterIds array are required',
  }),
  characterIds: Joi.array().items(positiveId).required().messages({
    'any.required': 'bossId, role, and characterIds array are required',
    'array.base': 'bossId, role, and characterIds array are required',
  }),
});

export const copySchema = Joi.object({
  sourceBossId: positiveId.required().messages({
    'any.required': 'sourceBossId and targetBossIds array are required',
  }),
  targetBossIds: Joi.array().items(positiveId).required().messages({
    'any.required': 'sourceBossId and targetBossIds array are required',
    'array.base': 'sourceBossId and targetBossIds array are required',
  }),
});

export const importSchema = Joi.object({
  sourceEventId: positiveId.required().messages({
    'any.required': 'sourceEventId is required',
  }),
});
