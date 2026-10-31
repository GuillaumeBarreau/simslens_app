import Joi from 'joi';

import { DUNGEON_ROLES } from '../../shared/constants/roles';

/** Valeurs de l'enum SignupStatus (cf. schema.prisma). */
export const SIGNUP_STATUSES = ['PRESENT', 'ABSENT', 'TENTATIVE', 'BENCH', 'LATE'];

/** lateTime est stocké au format "HH:MM". */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

export const realmScopeQuery = Joi.object({
  realmId: positiveId.required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
});

export const upsertSignupSchema = Joi.object({
  characterId: positiveId.required(),
  status: Joi.string()
    .valid(...SIGNUP_STATUSES)
    .required(),
  // Le rôle est recalculé depuis la spec côté service ; on accepte les rôles
  // de donjon (TANK/HEALER/DPS) tels que stockés en base.
  role: Joi.string()
    .valid(...DUNGEON_ROLES)
    .optional(),
  lateTime: Joi.string().pattern(TIME_PATTERN).allow('', null).optional().messages({
    'string.pattern.base': 'lateTime must use the HH:MM format',
  }),
  absenceReason: Joi.string().allow('', null).optional(),
});
