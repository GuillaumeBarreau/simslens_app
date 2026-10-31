import Joi from 'joi';

export const positiveId = Joi.number().integer().positive();

export const lootIdParam = Joi.object({
  id: positiveId.required().messages({
    'number.base': 'Loot not found',
    'any.required': 'Loot not found',
  }),
});

/**
 * `assignedTo` accepte la chaîne littérale "null" pour filtrer les butins non
 * attribués ; elle est convertie ici en `null`.
 *
 * Un motif plutôt que `.valid('null')` : Joi n'exécute pas `custom` sur une
 * valeur autorisée par `valid`, la conversion serait ignorée.
 */
export const listLootsQuery = Joi.object({
  instanceId: positiveId.required().messages({
    'number.base': 'instanceId query param is required',
    'any.required': 'instanceId query param is required',
  }),
  bossId: positiveId.optional(),
  assignedTo: Joi.alternatives()
    .try(
      positiveId,
      Joi.string()
        .pattern(/^null$/)
        .custom(() => null),
    )
    .optional(),
  realmId: positiveId.optional(),
});

export const createLootSchema = Joi.object({
  instanceId: positiveId.required().messages({
    'any.required': 'Missing required fields: instanceId, bossId, itemId',
  }),
  bossId: positiveId.required().messages({
    'any.required': 'Missing required fields: instanceId, bossId, itemId',
  }),
  itemId: positiveId.required().messages({
    'any.required': 'Missing required fields: instanceId, bossId, itemId',
  }),
  assignedTo: positiveId.allow(null).optional(),
  assignedBy: Joi.number().integer().min(0).allow(null).optional(),
});

/** assignedTo à null correspond à un désassignement. */
export const assignLootSchema = Joi.object({
  assignedTo: positiveId.allow(null).required().messages({
    'any.required': 'assignedTo is required',
  }),
  assignedBy: Joi.number().integer().min(0).allow(null).optional(),
});
