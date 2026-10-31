import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

export const positiveId = Joi.number().integer().positive();

export const requestDeviceCodeSchema = Joi.object({
  deviceName: Joi.string().trim().max(200).allow('', null).optional(),
});

export const exchangeDeviceCodeSchema = Joi.object({
  deviceCode: Joi.string().trim().min(1).required().messages({
    'any.required': 'device_code_required',
    'string.empty': 'device_code_required',
  }),
});

export const userCodeParam = Joi.object({
  userCode: Joi.string().trim().min(1).required(),
});

export const approveDeviceCodeSchema = Joi.object({
  userCode: Joi.string().trim().min(1).required(),
  // Le controller acceptait déjà une absence de liste (traitée comme vide).
  realmIds: Joi.array().items(positiveId).default([]),
});

/** Chiffres seuls (routeId) : le controller reçoit un nombre. */
export const tokenIdParam = Joi.object({
  id: routeId.required(),
});
