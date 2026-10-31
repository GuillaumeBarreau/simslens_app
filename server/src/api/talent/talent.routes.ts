import express from 'express';

import checkPermission from '../../middleware/checkPermission';
import { Permission } from '../../shared/config/permissions/permissions';
import * as controller from './talent.controller';
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  characterIdParam,
  loadoutQuery,
  treeQuery,
  saveLoadoutSchema,
  importSchema,
} = require('./talent.validation');

const router = express.Router();

/**
 * Scopé sous le personnage pour que le contexte realm soit résolu (permissions).
 */
router.get(
  '/characters/:id/talent-tree',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(characterIdParam),
  validateQuery(treeQuery),
  controller.getTalentTree,
);

router.get(
  '/characters/:id/talents',
  checkPermission(Permission.VIEW_WISHLIST),
  validateParams(characterIdParam),
  validateQuery(loadoutQuery),
  controller.getLoadout,
);

router.put(
  '/characters/:id/talents',
  checkPermission(Permission.MANAGE_WISHLIST),
  validateParams(characterIdParam),
  validateBody(saveLoadoutSchema),
  controller.saveLoadout,
);

router.post(
  '/characters/:id/talents/import',
  checkPermission(Permission.MANAGE_WISHLIST),
  validateParams(characterIdParam),
  validateBody(importSchema),
  controller.importFromBlizzard,
);

module.exports = router;
