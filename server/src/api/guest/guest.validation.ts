import Joi from 'joi';

import { RAID_ROLES } from '../../shared/constants/roles';

export const positiveId = Joi.number().integer().positive();

export const eventIdParam = Joi.object({
  eventId: positiveId.required().messages({
    'number.base': 'Event ID must be a number',
    'any.required': 'Event ID is required',
  }),
});

export const guestParam = eventIdParam.keys({
  guestId: positiveId.required(),
});

export const guestAssignmentParam = guestParam.keys({
  bossId: positiveId.required(),
});

/** realmId peut venir de la query ou du corps (cf. guest.controller). */
export const realmScopeQuery = Joi.object({
  realmId: positiveId.optional(),
});

export const roleField = Joi.string()
  .valid(...RAID_ROLES)
  .insensitive()
  .messages({
    'any.only': `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
  });

export const addGuestSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Guest name is required',
    'string.empty': 'Guest name is required',
  }),
  role: roleField.required().messages({
    'any.required': `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
  }),
  class: Joi.string().allow('', null).optional(),
  realmId: positiveId.optional(),
  addedBy: Joi.string().allow('', null).optional(),
});

export const assignGuestSchema = Joi.object({
  role: roleField.required().messages({
    'any.required': `Invalid role. Must be one of: ${RAID_ROLES.join(', ')}`,
  }),
});
