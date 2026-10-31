import express from 'express';

import * as ctrl from './item_dropped.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  lootIdParam,
  listLootsQuery,
  createLootSchema,
  assignLootSchema,
} = require('./item_dropped.validation');

router.get('/', validateQuery(listLootsQuery), ctrl.list);

router.get('/:id', validateParams(lootIdParam), ctrl.getById);

router.post(
  '/',
  checkPermission(Permission.MANAGE_RAID),
  validateBody(createLootSchema),
  ctrl.create,
);

router.patch(
  '/:id',
  checkPermission(Permission.MANAGE_RAID),
  validateParams(lootIdParam),
  validateBody(assignLootSchema),
  ctrl.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.MANAGE_RAID),
  validateParams(lootIdParam),
  ctrl.remove,
);

module.exports = router;
