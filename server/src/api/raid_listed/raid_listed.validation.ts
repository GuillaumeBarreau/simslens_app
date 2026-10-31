import Joi from 'joi';

/** Extension et saison sont des slugs, ex. "The-War-Within" / "season-03". */
export const slugField = Joi.string().trim().min(1);

export const seasonScopeQuery = Joi.object({
  extension: slugField.optional(),
  season: slugField.optional(),
});

export const raidIdParam = Joi.object({
  raidId: Joi.number().integer().positive().required().messages({
    'number.base': 'Missing extension or season parameters',
    'any.required': 'Missing extension or season parameters',
  }),
});
