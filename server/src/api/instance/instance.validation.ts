import Joi from 'joi';

export const positiveId = Joi.number().integer().positive();

/** Statuts d'une instance (cf. instances.status, défaut "ONGOING"). */
export const INSTANCE_STATUSES = ['ONGOING', 'COMPLETED'];

export const instanceIdParam = Joi.object({
  id: positiveId.required().messages({
    'number.base': 'Instance ID is required',
    'any.required': 'Instance ID is required',
  }),
});

export const listInstancesQuery = Joi.object({
  realmId: positiveId.optional(),
});

export const createInstanceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  date: Joi.date().required(),
  raidDifficultyId: positiveId.required().messages({
    'any.required': 'Raid difficulty ID is required',
  }),
  // realmId reste optionnel : le repository retombe sur ensureRealmId
  // lorsqu'il n'est pas fourni, et le client le déclare optionnel.
  realmId: positiveId.optional(),
  createdBy: positiveId.optional(),
  status: Joi.string()
    .valid(...INSTANCE_STATUSES)
    .optional(),
  totalBosses: Joi.number().integer().min(0).optional(),
  bossIds: Joi.array().items(positiveId).optional(),
});

export const updateInstanceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  date: Joi.date().optional(),
  raidDifficultyId: positiveId.optional(),
  status: Joi.string()
    .valid(...INSTANCE_STATUSES)
    .optional(),
  bossesKilled: Joi.number().integer().min(0).optional(),
  totalBosses: Joi.number().integer().min(0).optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const initializeBossesSchema = Joi.object({
  raidDifficultyId: positiveId.optional(),
});
