import Joi from 'joi';

/**
 * Entrées RCLootCouncil : le service tolère des entrées partielles (il
 * collecte les joueurs non résolus dans `unmatched`), donc seul le
 * conteneur est contraint ici, pas la forme de chaque ligne.
 */
export const ingestLootSchema = Joi.object({
  realmId: Joi.number().integer().positive().required().messages({
    'number.base': 'realmId_required',
    'any.required': 'realmId_required',
  }),
  source: Joi.string().trim().min(1).optional().default('rclootcouncil'),
  entries: Joi.array().items(Joi.object().unknown(true)).required().messages({
    'array.base': 'entries_must_be_array',
    'any.required': 'entries_must_be_array',
  }),
}).unknown(true);
