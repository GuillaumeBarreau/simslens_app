import express from 'express';

import { requireGameCapability } from '../../middleware/requireGameCapability';
import * as controller from './attunement.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const requireUser = require('../../middleware/requireUser');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  characterAttunementParam,
  realmQuery,
  saveAttunementSchema,
} = require('./attunement.validation');

// Référentiel (quêtes de chaque chaîne) : données de jeu, sans guilde.
router.get('/definitions', requireUser, controller.definitions);

// État du roster : guildes Forever seulement (SIMS-029).
router.get(
  '/',
  checkPermission(Permission.VIEW_ROSTER),
  requireGameCapability('attunements'),
  validateQuery(realmQuery),
  controller.list,
);

// Le joueur tient à jour ses propres personnages (allowSelfEdit), un officier
// ceux du roster.
router.put(
  '/characters/:characterId/:attunement',
  checkPermission(Permission.EDIT_ROSTER, { allowSelfEdit: true }),
  requireGameCapability('attunements'),
  validateParams(characterAttunementParam),
  validateBody(saveAttunementSchema),
  controller.save,
);

module.exports = router;
