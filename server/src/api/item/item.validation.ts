import Joi from 'joi';

/** Régions Battle.net supportées, même liste que blizzard.validation. */
export const REGIONS = ['EU', 'US', 'KR', 'TW', 'CN'];

/**
 * La région n'est pas réécrite : le service la transmet telle quelle à
 * l'API Blizzard, qui attend des minuscules (voir blizzard.validation).
 */
export const REGION_PATTERN = new RegExp(`^(${REGIONS.join('|')})$`, 'i');

export const itemIdParam = Joi.object({
  itemId: Joi.number().integer().positive().required().messages({
    'number.base': 'Item ID must be a valid number',
    'number.positive': 'Item ID must be a valid number',
    'any.required': 'Item ID must be a valid number',
  }),
});

export const itemQuery = Joi.object({
  region: Joi.string()
    .trim()
    .pattern(REGION_PATTERN)
    .optional()
    .default('eu')
    .messages({
      'string.pattern.base': `region must be one of: ${REGIONS.join(', ')}`,
    }),
});
