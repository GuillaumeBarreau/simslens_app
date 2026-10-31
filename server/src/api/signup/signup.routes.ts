import express from 'express';

import * as controller from './signup.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  eventCharacterParam,
  realmScopeQuery,
  upsertSignupSchema,
} = require('./signup.validation');

router.post(
  '/:eventId/signup',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(upsertSignupSchema),
  controller.upsert,
);

router.get(
  '/:eventId/roster',
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.getRoster,
);

router.delete(
  '/:eventId/signup/:characterId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventCharacterParam),
  validateQuery(realmScopeQuery),
  controller.remove,
);

module.exports = router;
