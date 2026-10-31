const Joi = require('joi');

const SUBSCRIPTION_TIERS = [1, 2, 3, 4, 5];

/** Périodicités acceptées (cf. realm_subscriptions.type). */
const SUBSCRIPTION_TYPES = ['monthly', 'annual'];

const realmIdParam = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Invalid realm id',
    'number.positive': 'Invalid realm id',
    'any.required': 'Invalid realm id',
  }),
});

const createSubscriptionSchema = Joi.object({
  tier: Joi.number()
    .valid(...SUBSCRIPTION_TIERS)
    .required()
    .messages({
      'any.required': 'tier, type, price and expiresAt are required',
      'any.only': 'tier must be between 1 and 5',
      'number.base': 'tier must be between 1 and 5',
    }),
  type: Joi.string()
    .valid(...SUBSCRIPTION_TYPES)
    .required()
    .messages({
      'any.required': 'tier, type, price and expiresAt are required',
      'any.only': 'type must be monthly or annual',
    }),
  price: Joi.number().min(0).required().messages({
    'any.required': 'tier, type, price and expiresAt are required',
  }),
  expiresAt: Joi.date().required().messages({
    'any.required': 'tier, type, price and expiresAt are required',
  }),
  note: Joi.string().allow('', null).optional(),
});

module.exports = {
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TYPES,
  realmIdParam,
  createSubscriptionSchema,
};
