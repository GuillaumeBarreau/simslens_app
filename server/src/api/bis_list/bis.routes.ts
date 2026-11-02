import express from 'express';

import { requireGameCapability } from '../../middleware/requireGameCapability';
import * as controller from './bis.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const { bisScopeQuery, bisSlotParam, realmQuery, saveBisSlotSchema } = require('./bis.validation');

// Lecture : tout membre qui consulte les wishlists. Guildes Forever seulement.
router.get(
  '/',
  checkPermission(Permission.VIEW_WISHLIST),
  requireGameCapability('bisLists'),
  validateQuery(bisScopeQuery),
  controller.get,
);

// Écriture de la liste de la guilde : les responsables du raid.
router.put(
  '/slots/:slot',
  checkPermission(Permission.MANAGE_RAID),
  requireGameCapability('bisLists'),
  validateParams(bisSlotParam),
  validateQuery(realmQuery),
  validateBody(saveBisSlotSchema),
  controller.saveSlot,
);

module.exports = router;
