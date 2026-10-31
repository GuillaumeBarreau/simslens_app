const express = require('express');
const router = express.Router();
const controller = require('./composition.controller');

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  realmScopeQuery,
  generateCompositionBody,
} = require('./composition.validation');

router.get(
  '/:eventId/composition-context',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.getContext,
);

router.post(
  '/:eventId/generate-composition',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(generateCompositionBody),
  controller.generate,
);

module.exports = router;
