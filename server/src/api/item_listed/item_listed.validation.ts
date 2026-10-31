import Joi from 'joi';

export const itemIdParam = Joi.object({
  itemID: Joi.number().integer().positive().required().messages({
    'number.base': 'Item ID is required',
    'number.positive': 'Item ID is required',
    'any.required': 'Item ID is required',
  }),
});
