import Joi from 'joi';

/**
 * `limit` n'est volontairement pas plafonné ici : resolveLimit le ramène
 * dans les bornes autorisées. On valide seulement sa forme,
 * pour qu'une valeur non numérique ne se transforme pas en NaN silencieux.
 */
export const listLogsQuery = Joi.object({
  limit: Joi.number().integer().positive().optional().messages({
    'number.base': 'limit must be a number',
    'number.positive': 'limit must be positive',
  }),
  characterName: Joi.string().trim().min(1).optional(),
  realmId: Joi.number().integer().positive().optional(),
});
