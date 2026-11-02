import express from 'express';

import { requireGameCapability } from '../../middleware/requireGameCapability';
import * as controller from './dungeon_group.controller';
import { requireGroupInRealm } from './dungeon_group.middleware';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  groupIdParam,
  groupMemberParam,
  groupGuestParam,
  realmScopeQuery,
  listGroupsQuery,
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  addGuestSchema,
  updateGuestSchema,
} = require('./dungeon_group.validation');

router.get('/', validateQuery(listGroupsQuery), controller.list);

router.get(
  '/:id',
  validateParams(groupIdParam),
  validateQuery(realmScopeQuery),
  requireGroupInRealm,
  controller.getById,
);

router.post(
  '/',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateBody(createGroupSchema),
  controller.create,
);

router.put(
  '/:id',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupIdParam),
  validateQuery(realmScopeQuery),
  validateBody(updateGroupSchema),
  requireGroupInRealm,
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupIdParam),
  validateQuery(realmScopeQuery),
  requireGroupInRealm,
  controller.remove,
);

router.post(
  '/:id/members',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupIdParam),
  validateQuery(realmScopeQuery),
  validateBody(addMemberSchema),
  requireGroupInRealm,
  controller.addMember,
);

router.delete(
  '/:id/members/:userId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupMemberParam),
  validateQuery(realmScopeQuery),
  requireGroupInRealm,
  controller.removeMember,
);

router.post(
  '/:id/guests',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupIdParam),
  validateQuery(realmScopeQuery),
  validateBody(addGuestSchema),
  requireGroupInRealm,
  controller.addGuest,
);

router.patch(
  '/:id/guests/:guestId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupGuestParam),
  validateQuery(realmScopeQuery),
  validateBody(updateGuestSchema),
  requireGroupInRealm,
  controller.updateGuest,
);

router.delete(
  '/:id/guests/:guestId',
  checkPermission(Permission.MANAGE_SIGNUPS),
  requireGameCapability('mythicPlus'),
  validateParams(groupGuestParam),
  validateQuery(realmScopeQuery),
  requireGroupInRealm,
  controller.removeGuest,
);

module.exports = router;
