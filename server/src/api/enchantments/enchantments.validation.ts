import Joi from 'joi';

export const characterIdParam = Joi.object({
  characterId: Joi.number().integer().positive().required().messages({
    'number.base': 'Invalid characterId',
    'number.positive': 'Invalid characterId',
    'any.required': 'Invalid characterId',
  }),
});

/**
 * `ids` est une liste d'identifiants séparés par des virgules. Joi valide la
 * forme puis la convertit en liste de nombres.
 */
export const bulkVerifyQuery = Joi.object({
  ids: Joi.string()
    .pattern(/^\d+(\s*,\s*\d+)*$/)
    .custom((value: string) => value.split(',').map((id) => parseInt(id.trim(), 10)))
    .required()
    .messages({
      'any.required': 'Missing ids query parameter',
      'string.pattern.base': 'No valid ids provided',
    }),
});
