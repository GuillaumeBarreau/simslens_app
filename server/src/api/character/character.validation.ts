import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

const positiveId = Joi.number().integer().positive();

/**
 * Identifiants de route : chiffres uniquement (routeId), pour que Joi et
 * checkPermission lisent toujours le même personnage (SIMS-171).
 */
export const characterIdParam = Joi.object({
  characterId: routeId.required(),
});

export const checkMountParam = characterIdParam.keys({
  mountId: routeId.required(),
});

export const idParam = Joi.object({
  id: routeId.required(),
});

export const characterNameParam = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Character name must be at least 2 characters',
    'string.max': 'Character name cannot exceed 50 characters',
    'any.required': 'Character name is required',
  }),
});

/** Tag Discord lu par le bot (`pseudo`, `@pseudo`, `pseudo#0`…). */
export const discordTagParam = Joi.object({
  tag: Joi.string().trim().min(1).max(100).required(),
});

export const listCharactersQuery = Joi.object({
  realmId: positiveId.optional(),
});

export const rosterStatusQuery = Joi.object({
  includeArchived: Joi.string().valid('0', '1', 'true', 'false').optional(),
  includePending: Joi.string().valid('0', '1', 'true', 'false').optional(),
  difficulty: Joi.string().valid('lfr', 'normal', 'heroic', 'mythic').optional(),
  realmId: positiveId.optional(),
});

/**
 * `ids` est une liste d'identifiants séparés par des virgules. Joi valide la
 * forme puis la convertit en liste de nombres (cf. enchantments.validation).
 */
export const bulkGearQuery = Joi.object({
  ids: Joi.string()
    .pattern(/^[1-9]\d*(\s*,\s*[1-9]\d*)*$/)
    .custom((value: string) => value.split(',').map((id) => Number(id.trim())))
    .required()
    .messages({
      'any.required': 'Missing ids query parameter',
      'string.pattern.base': 'No valid ids provided',
    }),
});

export const keyHistoryQuery = Joi.object({
  realmId: positiveId.required(),
  weekStart: Joi.date().iso().optional(),
  minLevel: Joi.number().integer().min(0).max(99).optional(),
});

/**
 * Classe et spé : Joi ne contrôle que la forme. L'appartenance de la spé à la
 * classe est vérifiée par resolveSpecialization (SIMS-213). La spé se donne
 * par nom anglais (`spec`) ou par identifiant (`specializationId`), pas les deux.
 */
const characterClass = Joi.string().trim().min(1).max(50);
const specName = Joi.string().trim().min(1).max(50);

export const createCharacterSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  realm: Joi.string().min(2).max(50).required(),
  region: Joi.string().valid('EU', 'US', 'KR', 'TW', 'CN').default('EU'),
  class: characterClass.required(),
  spec: specName.optional(),
  specializationId: positiveId.optional(),
  discordTag: Joi.string().allow('', null).optional(),
  userId: Joi.string().optional(),
}).oxor('spec', 'specializationId');

/**
 * Spé principale et off-specs (SIMS-212). La liste des off-specs est complète
 * (elle remplace la précédente) ; l'appartenance à la classe et l'exclusion de
 * la spé principale sont vérifiées par l'usecase.
 */
export const updateCharacterSpecializationsSchema = Joi.object({
  specializationId: positiveId.optional(),
  offSpecializationIds: Joi.array().items(positiveId).unique().max(4).required(),
});

export const updateCharacterSchema = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  realm: Joi.string().min(2).max(50).optional(),
  region: Joi.string().valid('EU', 'US', 'KR', 'TW', 'CN').optional(),
  class: characterClass.optional(),
  spec: specName.optional(),
  specializationId: positiveId.optional(),
  archived: Joi.alternatives()
    .try(
      Joi.number().valid(0, 1),
      Joi.boolean().custom((value: boolean) => (value ? 1 : 0)),
    )
    .optional(),
  realmId: positiveId.allow(null).optional(),
  discordTag: Joi.string().allow('', null).optional(),
  userId: Joi.string().allow(null).optional(),
  status: Joi.string().valid('pending', 'approved', 'archived').optional(),
})
  .min(1)
  .oxor('spec', 'specializationId');
