const Joi = require('joi');

const positiveId = Joi.number().integer().positive();

/**
 * Les lignes d'un import SimC/CSV sont hétérogènes : le service les
 * normalise et collecte les joueurs ignorés. Seul le conteneur est validé.
 */
const uploadSchema = Joi.object({
  filename: Joi.string().trim().min(1).optional(),
  rows: Joi.array().required().messages({
    'array.base': 'rows must be an array',
    'any.required': 'rows is required',
  }),
  realmId: positiveId.required(),
  extension: Joi.string().trim().min(1).optional(),
  season: Joi.string().trim().min(1).optional(),
  instanceId: positiveId.optional(),
}).unknown(true);

/**
 * `all=1` demande tous les personnages du royaume et rend characterIds
 * inutile ; sinon characterIds est une liste séparée par des virgules.
 */
const bulkLootsQuery = Joi.object({
  all: Joi.boolean().truthy('1').falsy('0').optional().default(false),
  characterIds: Joi.string()
    .pattern(/^\d+(\s*,\s*\d+)*$/)
    .optional()
    .custom((value) => value.split(',').map((id) => parseInt(id.trim(), 10)))
    .messages({
      'string.pattern.base': 'characterIds must be a comma-separated list of ids',
    }),
  realmId: positiveId.required(),
});

module.exports = { uploadSchema, bulkLootsQuery };
