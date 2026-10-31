import express from 'express';

import * as controller from './guest.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  guestParam,
  guestAssignmentParam,
  realmScopeQuery,
  addGuestSchema,
  assignGuestSchema,
} = require('./guest.validation');

router.post(
  '/:eventId/guests',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(addGuestSchema),
  controller.add,
);

router.delete(
  '/:eventId/guests/:guestId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(guestParam),
  controller.remove,
);

router.get(
  '/:eventId/guests/assignments',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(eventIdParam),
  controller.getAssignments,
);

router.put(
  '/:eventId/guests/:guestId/assignments/:bossId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(guestAssignmentParam),
  validateBody(assignGuestSchema),
  controller.upsertAssignment,
);

router.delete(
  '/:eventId/guests/:guestId/assignments/:bossId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(guestAssignmentParam),
  controller.removeAssignment,
);

module.exports = router;
