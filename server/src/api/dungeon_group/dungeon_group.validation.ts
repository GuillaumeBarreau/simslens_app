import Joi from 'joi';

import { DUNGEON_ROLES } from '../../shared/constants/roles';

/** Créneaux stockés au format "HH:MM". */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Types de donjon supportés par l'app. */
export const DUNGEON_TYPES = ['M0', 'M+'];

/** Statuts d'un groupe (cf. dungeon_groups.status). */
export const GROUP_STATUSES = ['DRAFT', 'CONFIRMED'];

export const timeField = Joi.string().pattern(TIME_PATTERN).messages({
  'string.pattern.base': 'Time must use the HH:MM format',
});

export const realmIdField = Joi.number().integer().positive().messages({
  'number.base': 'realmId must be a number',
  'any.required': 'realmId is required',
});

export const groupIdParam = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const groupMemberParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  userId: Joi.string().required(),
});

export const groupGuestParam = Joi.object({
  id: Joi.number().integer().positive().required(),
  guestId: Joi.number().integer().positive().required(),
});

export const realmScopeQuery = Joi.object({
  realmId: realmIdField.required(),
});

export const listGroupsQuery = Joi.object({
  realmId: realmIdField.required(),
  date: Joi.date().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

export const createGroupSchema = Joi.object({
  realmId: realmIdField.required(),
  date: Joi.date().required(),
  startTime: timeField.required(),
  endTime: timeField.required(),
  type: Joi.string()
    .valid(...DUNGEON_TYPES)
    .required(),
  note: Joi.string().allow('', null).optional(),
});

export const updateGroupSchema = Joi.object({
  startTime: timeField.optional(),
  endTime: timeField.optional(),
  type: Joi.string()
    .valid(...DUNGEON_TYPES)
    .optional(),
  note: Joi.string().allow('', null).optional(),
  status: Joi.string()
    .valid(...GROUP_STATUSES)
    .optional(),
}).min(1);

export const addMemberSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': 'userId and role are required',
  }),
  role: Joi.string()
    .valid(...DUNGEON_ROLES)
    .required()
    .messages({
      'any.required': 'userId and role are required',
    }),
});

export const addGuestSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Guest name is required',
    'string.empty': 'Guest name is required',
  }),
  role: Joi.string()
    .valid(...DUNGEON_ROLES)
    .required(),
  class: Joi.string().allow('', null).optional(),
});

export const updateGuestSchema = Joi.object({
  slotId: Joi.string().allow(null).optional(),
});
