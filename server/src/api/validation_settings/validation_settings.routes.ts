import express from 'express';

import * as controller from './validation_settings.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams } = require('../../shared/middleware/validate');
const { realmIdParam, updateSettingsBody } = require('./validation_settings.validation');

// Lecture ouverte aux membres : ils doivent connaître les réglages exigés pour lancer
// un Droptimizer valide (SIMS-137). La modification reste réservée aux gestionnaires.
router.get(
  '/:realmId',
  checkPermission(Permission.VIEW_ROSTER),
  validateParams(realmIdParam),
  controller.getSettings,
);

router.put(
  '/:realmId',
  checkPermission(Permission.MANAGE_REALM),
  validateParams(realmIdParam),
  validateBody(updateSettingsBody),
  controller.updateSettings,
);

module.exports = router;
