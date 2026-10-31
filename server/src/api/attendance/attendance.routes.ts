import express from 'express';

import * as controller from './attendance.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateParams, validateQuery } = require('../../shared/middleware/validate');
const { characterIdParam, attendanceQuery } = require('./attendance.validation');

router.get(
  '/',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateQuery(attendanceQuery),
  controller.getAttendance,
);

// Équité du loot (SIMS-201) : réservée aux officiers. ASSIGN_LOOT est la
// permission d'attribution du butin, accordée aux modérateurs et aux
// administrateurs mais pas aux membres (#146, journal visible des joueurs, a
// été refusé).
router.get(
  '/loot-equity',
  checkPermission(Permission.ASSIGN_LOOT),
  validateQuery(attendanceQuery),
  controller.getLootEquity,
);

router.get(
  '/character/:characterId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(characterIdParam),
  validateQuery(attendanceQuery),
  controller.getCharacterDetail,
);

module.exports = router;
