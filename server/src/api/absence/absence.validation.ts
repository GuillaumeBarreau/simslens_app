import Joi from 'joi';

export const absenceIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Absence ID must be a number',
    'number.positive': 'Absence ID must be positive',
    'any.required': 'Absence ID is required',
  }),
});

export const realmScopeQuery = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
});

export const listAbsencesQuery = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'number.base': 'realmId must be a number',
    'any.required': 'realmId is required',
  }),
  userId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

export const createAbsenceSchema = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'any.required': 'realmId is required',
  }),
  startDate: Joi.date().required().messages({
    'any.required': 'startDate is required',
  }),
  endDate: Joi.date().min(Joi.ref('startDate')).required().messages({
    'any.required': 'endDate is required',
    'date.min': 'endDate must be on or after startDate',
  }),
  reason: Joi.string().allow('', null).optional(),
});

export const updateAbsenceSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  reason: Joi.string().allow('', null).optional(),
}).min(1);
