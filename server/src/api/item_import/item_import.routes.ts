import express from 'express';

import * as controller from './item_import.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateQuery } = require('../../shared/middleware/validate');
const { uploadSchema, bulkLootsQuery } = require('./item_import.validation');

// Importer exige la même permission que la page d'import (import_simc) sur le
// royaume du corps ; lire exige view_loot_history et ne renvoie que ce royaume.
// GET /loots?characterId= a été retirée (aucun appelant, aucun cloisonnement).
router.post(
  '/upload',
  checkPermission(Permission.IMPORT_SIMC),
  validateBody(uploadSchema),
  controller.upload,
);

router.get(
  '/loots/bulk',
  checkPermission(Permission.VIEW_LOOT_HISTORY),
  validateQuery(bulkLootsQuery),
  controller.getLootsBulk,
);

module.exports = router;
