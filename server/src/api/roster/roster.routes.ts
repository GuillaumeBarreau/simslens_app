import express from 'express';

import * as controller from './roster.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  eventCharacterParam,
  eventBossParam,
  realmScopeQuery,
  realmScopeWithBossQuery,
  assignSchema,
  reorderSchema,
  copySchema,
  importSchema,
} = require('./roster.validation');

router.get(
  '/:eventId/roster-assignments',
  validateParams(eventIdParam),
  validateQuery(realmScopeWithBossQuery),
  controller.getRoster,
);

router.get(
  '/:eventId/roster-pool',
  validateParams(eventIdParam),
  validateQuery(realmScopeWithBossQuery),
  controller.getPool,
);

router.post(
  '/:eventId/roster-assignments',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(assignSchema),
  controller.assign,
);

router.delete(
  '/:eventId/roster-assignments/:characterId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventCharacterParam),
  validateQuery(realmScopeWithBossQuery),
  controller.remove,
);

router.put(
  '/:eventId/roster-reorder',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(reorderSchema),
  controller.reorder,
);

router.post(
  '/:eventId/roster-copy',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(copySchema),
  controller.copy,
);

router.delete(
  '/:eventId/roster-boss/:bossId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventBossParam),
  validateQuery(realmScopeQuery),
  controller.clearBoss,
);

router.get(
  '/:eventId/past-rosters',
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.getPastRosters,
);

router.get(
  '/:eventId/roster-replacements',
  checkPermission(Permission.MANAGE_EVENT_ROSTER),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.getReplacements,
);

router.post(
  '/:eventId/roster-import',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(importSchema),
  controller.importFromEvent,
);

module.exports = router;
