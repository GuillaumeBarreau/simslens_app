import Joi from 'joi';

export const tokenItemParam = Joi.object({
  itemId: Joi.number().integer().positive().required().messages({
    'number.base': 'itemId must be a number',
    'any.required': 'itemId is required',
  }),
});
