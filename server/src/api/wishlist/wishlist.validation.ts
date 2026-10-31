import { WISHLIST_PRIORITY_VALUES } from '../../shared/constants/wishlistPriority';
import { VALID_SLOTS } from '../../shared/constants/wow';
import { routeId } from '../../shared/validation/routeId';

const Joi = require('joi');

export const wishlistQuery = Joi.object({
  specializationId: Joi.number().integer().positive().required().messages({
    'any.required': 'specializationId is required',
    'number.positive': 'specializationId must be positive',
  }),
});

export const updateWishlistItemSchema = Joi.object({
  itemId: Joi.number().integer().positive().allow(null).required().messages({
    'number.base': 'Item ID must be a number',
    'number.positive': 'Item ID must be positive',
    'any.required': 'Item ID is required',
  }),
  // Échelle WISHLIST_PRIORITY (SIMS-205) : 0 non précisée, 1 BiS … 5 « je n'en veux pas ».
  priority: Joi.number()
    .integer()
    .valid(...WISHLIST_PRIORITY_VALUES)
    .required()
    .messages({
      'any.only': 'Priority must be between 0 and 5',
      'any.required': 'Priority is required',
    }),
  specializationId: Joi.number().integer().positive().required().messages({
    'any.required': 'specializationId is required',
    'number.positive': 'specializationId must be positive',
  }),
});

export const copyWishlistFromCharacterSchema = Joi.object({
  targetSpecializationId: Joi.number().integer().positive().required(),
  sourceSpecializationId: Joi.number().integer().positive().required(),
});

export const availableItemsQuery = Joi.object({
  classId: Joi.number().integer().positive().optional(),
  specName: Joi.string().optional(),
});

// Chiffres seuls : voir routeId (même identifiant pour checkPermission et le handler).
const characterId = routeId.required();

/** `:id` des routes `/characters/:id/wishlist...` : l'identifiant du personnage. */
export const characterIdParam = Joi.object({ id: characterId });

export const wishlistItemParams = Joi.object({
  id: characterId,
  slot: Joi.string().required(),
});

export const copyFromCharacterParams = Joi.object({
  id: characterId,
  sourceId: characterId,
});

/** `:id` et `:slot` des alternatives (SIMS-205) : emplacement connu uniquement. */
export const wishlistSlotParams = Joi.object({
  id: characterId,
  slot: Joi.string()
    .valid(...VALID_SLOTS)
    .required(),
});

const specializationIdField = Joi.number().integer().positive().required();
// Pas de liste de référence côté serveur pour la difficulté (table `difficulties`,
// casse variable), l'extension et la saison : chaînes non vides et bornées.
const difficultyField = Joi.string().trim().min(1).max(32).required();
const seasonField = Joi.string().trim().min(1).max(64).required();

/** Query de l'état des vœux (SIMS-205). */
export const wishlistStatusQuery = Joi.object({
  specializationId: specializationIdField,
  difficulty: difficultyField,
});

/** Query des alternatives d'un emplacement (SIMS-205). */
export const wishlistAlternativesQuery = wishlistStatusQuery.keys({
  extension: seasonField,
  season: seasonField,
});

export const availableItemsParams = Joi.object({
  extension: Joi.string().required(),
  season: Joi.string().required(),
  slot: Joi.string().required(),
});
