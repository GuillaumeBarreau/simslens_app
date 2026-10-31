import express from 'express';

import * as controller from './activity_log.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateQuery } = require('../../shared/middleware/validate');
const { listLogsQuery } = require('./activity_log.validation');

router.get(
  '/',
  checkPermission(Permission.VIEW_ACTIVITY_LOG),
  validateQuery(listLogsQuery),
  controller.getLogs,
);

module.exports = router;
