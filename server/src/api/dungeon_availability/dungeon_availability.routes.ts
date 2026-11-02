import express from 'express';

import { requireGameCapability } from '../../middleware/requireGameCapability';
import * as controller from './dungeon_availability.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  availabilityIdParam,
  realmScopeQuery,
  listAvailabilitiesQuery,
  createAvailabilitySchema,
  updateAvailabilitySchema,
} = require('./dungeon_availability.validation');

router.get('/', validateQuery(listAvailabilitiesQuery), controller.list);

router.get(
  '/:id',
  validateParams(availabilityIdParam),
  validateQuery(realmScopeQuery),
  controller.getById,
);

router.post(
  '/',
  checkPermission(Permission.SIGNUP_EVENT),
  requireGameCapability('mythicPlus'),
  validateBody(createAvailabilitySchema),
  controller.create,
);

router.put(
  '/:id',
  checkPermission(Permission.SIGNUP_EVENT),
  requireGameCapability('mythicPlus'),
  validateParams(availabilityIdParam),
  validateQuery(realmScopeQuery),
  validateBody(updateAvailabilitySchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.SIGNUP_EVENT),
  requireGameCapability('mythicPlus'),
  validateParams(availabilityIdParam),
  validateQuery(realmScopeQuery),
  controller.remove,
);

module.exports = router;
