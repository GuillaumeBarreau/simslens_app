const express = require('express');
const router = express.Router({ mergeParams: true });
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const {
  getInstanceBosses,
  getBossStatus,
  killBoss,
  resurrectBoss,
} = require('./instance_boss_killed.controller');

router.get('/', getInstanceBosses);

router.get('/:bossId', getBossStatus);

router.patch('/:bossId/kill', checkPermission(Permission.MANAGE_INSTANCE), killBoss);

router.patch('/:bossId/resurrect', checkPermission(Permission.MANAGE_INSTANCE), resurrectBoss);

module.exports = router;
