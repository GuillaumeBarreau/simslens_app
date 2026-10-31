import Joi from 'joi';

import { routeId } from '../../shared/validation/routeId';

export const positiveId = Joi.number().integer().positive();

/**
 * Les routes d'invitation sont montées sous /realms/:id, qui recopie :id
 * dans :realmId avant checkPermission (cf. realm.routes).
 */
export const realmScopedParam = Joi.object({
  id: positiveId.required().messages({
    'number.base': 'Realm ID must be a number',
    'any.required': 'Realm ID is required',
  }),
  realmId: Joi.any().optional(),
});

export const inviteCodeParam = realmScopedParam.keys({
  codeId: positiveId.required(),
});

/**
 * Chiffres seuls (routeId) : avec une chaîne libre, "1.234e3" passait le
 * contrôle de royaume sur l'invité 1234 (Number) et supprimait l'invité 1
 * d'une autre guilde (parseInt) — SIMS-179.
 */
export const guestMemberParam = realmScopedParam.keys({
  guestId: routeId.required(),
});

export const joinCodeParam = Joi.object({
  code: Joi.string().trim().min(1).required().messages({
    'any.required': 'Invite code is required',
    'string.empty': 'Invite code is required',
  }),
});

export const createInviteCodeSchema = Joi.object({
  expiresAt: Joi.date().allow(null).optional(),
  maxUses: positiveId.allow(null).optional(),
});
