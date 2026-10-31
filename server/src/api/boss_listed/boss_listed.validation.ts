import Joi from 'joi';

export const slugField = Joi.string().trim().min(1);

export const seasonScopeQuery = Joi.object({
  extension: slugField.optional(),
  season: slugField.optional(),
});
