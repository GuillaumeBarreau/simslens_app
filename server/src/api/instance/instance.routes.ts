import express from 'express';

import * as controller from './instance.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  instanceIdParam,
  listInstancesQuery,
  createInstanceSchema,
  updateInstanceSchema,
  initializeBossesSchema,
} = require('./instance.validation');

router.get('/', validateQuery(listInstancesQuery), controller.list);
router.get('/:id', validateParams(instanceIdParam), controller.getById);

router.post(
  '/',
  checkPermission(Permission.MANAGE_INSTANCE),
  validateBody(createInstanceSchema),
  controller.create,
);

router.post(
  '/:id/initialize-bosses',
  checkPermission(Permission.MANAGE_INSTANCE),
  validateParams(instanceIdParam),
  validateBody(initializeBossesSchema),
  controller.initializeBosses,
);

router.put(
  '/:id',
  checkPermission(Permission.MANAGE_INSTANCE),
  validateParams(instanceIdParam),
  validateBody(updateInstanceSchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.MANAGE_INSTANCE),
  validateParams(instanceIdParam),
  controller.remove,
);

module.exports = router;
