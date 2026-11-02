import type { NextFunction, Request, Response } from 'express';
import express from 'express';

import * as inviteController from '../invite/invite.controller';
import * as controller from './realm.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const requireUser = require('../../middleware/requireUser');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams } = require('../../shared/middleware/validate');
const {
  realmIdParam,
  realmOwnerParam,
  createRealmSchema,
  addCharacterSchema,
  addOwnerSchema,
  updateOwnerRoleSchema,
  updateSettingsSchema,
} = require('./realm.validation');
const {
  realmScopedParam: inviteRealmParam,
  inviteCodeParam,
  guestMemberParam,
  createInviteCodeSchema,
} = require('../invite/invite.validation');

/**
 * checkPermission lit le royaume dans :realmId ; ces routes le portent
 * dans :id. À placer avant checkPermission.
 */
const mapIdToRealmId = (req: Request, _res: Response, next: NextFunction) => {
  if (req.params.id) req.params.realmId = req.params.id;
  next();
};

router.get('/', controller.list);
router.post('/', requireUser, validateBody(createRealmSchema), controller.create);
router.get('/check', controller.check);
// Guildes de l'utilisateur et leur jeu (SIMS-062). Avant /:id.
router.get('/mine', requireUser, controller.mine);
router.get('/:id', validateParams(realmIdParam), controller.get);

/**
 * Réservé aux responsables du royaume (dette 20, SIMS-182) ; le repository
 * refuse en plus un personnage déjà rattaché à un autre royaume.
 */
router.patch(
  '/:id/add-character',
  mapIdToRealmId,
  checkPermission(Permission.EDIT_ROSTER),
  requireUser,
  validateParams(realmIdParam),
  validateBody(addCharacterSchema),
  controller.addCharacter,
);

router.get(
  '/:id/owners',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  requireUser,
  validateParams(realmIdParam),
  controller.getOwners,
);
router.post(
  '/:id/owners',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  requireUser,
  validateParams(realmIdParam),
  validateBody(addOwnerSchema),
  controller.addOwner,
);
router.delete(
  '/:id/owners/:ownerId',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  requireUser,
  validateParams(realmOwnerParam),
  controller.removeOwner,
);
router.patch(
  '/:id/owners/:ownerId',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  requireUser,
  validateParams(realmOwnerParam),
  validateBody(updateOwnerRoleSchema),
  controller.updateOwnerRole,
);

// Contrôle d'accès dans les usecases : /users réservé aux responsables du
// royaume, /my-permissions ne renvoie que le rôle de l'appelant.
router.get('/:id/users', requireUser, validateParams(realmIdParam), controller.getUsers);
router.get(
  '/:id/my-permissions',
  requireUser,
  validateParams(realmIdParam),
  controller.getMyPermissions,
);
router.patch(
  '/:id/settings',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  requireUser,
  validateParams(realmIdParam),
  validateBody(updateSettingsSchema),
  controller.updateSettings,
);

router.get(
  '/:id/invites',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  validateParams(inviteRealmParam),
  inviteController.listCodes,
);
router.post(
  '/:id/invites',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  validateParams(inviteRealmParam),
  validateBody(createInviteCodeSchema),
  inviteController.createCode,
);
router.delete(
  '/:id/invites/:codeId',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  validateParams(inviteCodeParam),
  inviteController.deleteCode,
);

router.get(
  '/:id/guest-members',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  validateParams(inviteRealmParam),
  inviteController.listGuests,
);
router.delete(
  '/:id/guest-members/:guestId',
  mapIdToRealmId,
  checkPermission(Permission.MANAGE_REALM),
  validateParams(guestMemberParam),
  inviteController.removeGuest,
);

module.exports = router;
