import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';
import { BIS_SLOTS, MAX_ITEMS_PER_SLOT } from './bis.constants';

const specializationId = Joi.number().integer().positive().required();
const season = Joi.string().trim().min(1).max(32).required();

export const bisScopeQuery = Joi.object({
  realmId: routeId.required(),
  specializationId,
  season,
});

export const bisSlotParam = Joi.object({
  slot: Joi.string()
    .valid(...BIS_SLOTS)
    .required(),
});

export const realmQuery = Joi.object({
  realmId: routeId.required(),
});

export const saveBisSlotSchema = Joi.object({
  specializationId,
  season,
  items: Joi.array()
    .items(
      Joi.object({
        itemId: Joi.number().integer().positive().required(),
        note: Joi.string().trim().max(200).allow('', null),
      }),
    )
    .max(MAX_ITEMS_PER_SLOT)
    .required(),
});

export const deleteBisSlotQuery = Joi.object({
  realmId: routeId.required(),
  specializationId,
  season,
});
