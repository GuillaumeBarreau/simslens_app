import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

/** Longueur maximale d'une note : large pour une stratégie, borne contre l'abus. */
export const MAX_CONTENT_LENGTH = 10_000;
export const MAX_TASK_LENGTH = 200;
export const MAX_ASSIGNMENTS = 40;

export const eventIdParam = Joi.object({
  eventId: routeId.required(),
});

export const eventBossParam = eventIdParam.keys({
  bossId: routeId.required(),
});

/**
 * Royaume de la query, facultatif : checkPermission le compare à celui de
 * l'événement. Le controller ne s'en sert pas, il lit le royaume vérifié.
 */
export const realmScopeQuery = Joi.object({
  realmId: routeId.optional(),
});

export const saveBossNoteSchema = Joi.object({
  content: Joi.string().allow('').max(MAX_CONTENT_LENGTH).required(),
  assignments: Joi.array()
    .items(
      Joi.object({
        characterId: Joi.number().integer().positive().required(),
        task: Joi.string().trim().allow('').max(MAX_TASK_LENGTH).required(),
      }),
    )
    .max(MAX_ASSIGNMENTS)
    .default([]),
});
