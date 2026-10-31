import express from 'express';

import * as controller from './boss_note.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  eventBossParam,
  realmScopeQuery,
  saveBossNoteSchema,
} = require('./boss_note.validation');

router.get(
  '/:eventId/boss-notes',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.list,
);

router.put(
  '/:eventId/boss-notes/:bossId',
  checkPermission(Permission.MANAGE_EVENT_ROSTER),
  validateParams(eventBossParam),
  validateQuery(realmScopeQuery),
  validateBody(saveBossNoteSchema),
  controller.save,
);

module.exports = router;
