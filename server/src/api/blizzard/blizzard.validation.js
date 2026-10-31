const Joi = require('joi');

/** Régions Battle.net supportées (mêmes valeurs que character.validation). */
const REGIONS = ['EU', 'US', 'KR', 'TW', 'CN'];

/**
 * La région est validée sans être réécrite.
 *
 * Chaque handler gère sa propre casse : le service construit des hôtes et
 * des namespaces en minuscules (`profile-${region}`) tandis que claimByBnet
 * repasse la valeur en majuscules. Un `.valid().insensitive()` normaliserait
 * la valeur et casserait l'un des deux.
 */
const REGION_PATTERN = new RegExp(`^(${REGIONS.join('|')})$`, 'i');

const regionField = Joi.string()
  .trim()
  .pattern(REGION_PATTERN)
  .messages({
    'string.pattern.base': `region must be one of: ${REGIONS.join(', ')}`,
  });

const listCharactersQuery = Joi.object({
  region: regionField.optional(),
});

const claimCharacterSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Name and Realm are required',
    'string.empty': 'Name and Realm are required',
  }),
  realm: Joi.string().trim().min(1).required().messages({
    'any.required': 'Name and Realm are required',
    'string.empty': 'Name and Realm are required',
  }),
  region: regionField.optional(),
});

const guildRosterQuery = Joi.object({
  realm: Joi.string().trim().min(1).required().messages({
    'any.required': 'Realm and Guild name are required',
    'string.empty': 'Realm and Guild name are required',
  }),
  guild: Joi.string().trim().min(1).required().messages({
    'any.required': 'Realm and Guild name are required',
    'string.empty': 'Realm and Guild name are required',
  }),
  region: regionField.optional(),
  realmId: Joi.number().integer().positive().required(),
});

const importGuildMembersSchema = Joi.object({
  members: Joi.array().items(Joi.object().unknown(true)).required().messages({
    'array.base': 'Members must be an array',
    'any.required': 'Members must be an array',
  }),
  region: regionField.optional(),
  realmId: Joi.number().integer().positive().required(),
});

module.exports = {
  REGIONS,
  listCharactersQuery,
  claimCharacterSchema,
  guildRosterQuery,
  importGuildMembersSchema,
};
