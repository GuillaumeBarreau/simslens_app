import { routeId } from '../../shared/validation/routeId';

const Joi = require('joi');

const selectedNode = Joi.object({
  rank: Joi.number().integer().min(0).max(10).required(),
  choiceIndex: Joi.number().integer().min(0).optional(),
});

export const treeQuery = Joi.object({
  specId: Joi.number().integer().positive().required().messages({
    'any.required': 'specId is required',
    'number.positive': 'specId must be positive',
  }),
});

export const loadoutQuery = Joi.object({
  specId: Joi.number().integer().positive().required().messages({
    'any.required': 'specId is required',
    'number.positive': 'specId must be positive',
  }),
});

export const saveLoadoutSchema = Joi.object({
  specializationId: Joi.number().integer().positive().required(),
  selectedNodes: Joi.object().pattern(Joi.string(), selectedNode).required(),
  exportString: Joi.string().allow(null, '').optional(),
  label: Joi.string().allow(null, '').max(100).optional(),
});

export const importSchema = Joi.object({
  specializationId: Joi.number().integer().positive().required(),
});

export const characterIdParam = Joi.object({
  id: routeId.required(),
});
