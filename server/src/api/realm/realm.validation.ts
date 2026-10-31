import Joi from 'joi';

import { REALM_OWNER_ROLES } from './realm.constants';

export const realmIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Realm ID must be a number',
    'any.required': 'Realm ID is required',
  }),
  // realm.routes recopie :id dans :realmId avant checkPermission
  realmId: Joi.any().optional(),
});

export const realmOwnerParam = realmIdParam.keys({
  ownerId: Joi.string().required(),
});

export const createRealmSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  server: Joi.string().trim().min(2).max(100).required(),
  region: Joi.string().valid('EU', 'US', 'KR', 'TW', 'CN').required(),
});

export const addCharacterSchema = Joi.object({
  characterId: Joi.number().integer().positive().required().messages({
    'any.required': 'characterId is required',
  }),
});

export const addOwnerSchema = Joi.object({
  ownerId: Joi.string().required().messages({
    'any.required': 'ownerId and role are required',
  }),
  role: Joi.string()
    .valid(...REALM_OWNER_ROLES)
    .required()
    .messages({
      'any.required': 'ownerId and role are required',
      'any.only': `Invalid role. Must be ${REALM_OWNER_ROLES.join(', ')}`,
    }),
});

/** Délais exprimés en heures : un mois au plus (cf. manageRealmSettings). */
const hoursField = Joi.number().integer().min(0).max(720);

/** Identifiant Discord (snowflake) ; vide ou null pour le retirer. */
const discordIdField = Joi.string().trim().allow('', null);

/**
 * Réglages modifiables d'un royaume. Les autres clés sont retirées
 * (stripUnknown), comme le usecase ne reprenait que ces champs.
 */
export const updateSettingsSchema = Joi.object({
  discordGuildId: discordIdField,
  discordRaidCategoryId: discordIdField,
  signupLockHours: hoursField,
  signupReminderHours: hoursField,
  confirmReminderHours: hoursField,
  // Nom IANA (« Europe/Paris ») ; son existence est vérifiée par le usecase.
  timezone: Joi.string().trim().min(1).max(64),
});

export const updateOwnerRoleSchema = Joi.object({
  role: Joi.string()
    .valid(...REALM_OWNER_ROLES)
    .required()
    .messages({
      'any.required': 'role is required',
      'any.only': `Invalid role. Must be ${REALM_OWNER_ROLES.join(', ')}`,
    }),
});
