import express from 'express';

import * as controller from './item_upgrade.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  realmScopeQuery,
  realmRequiredQuery,
  itemDifficultyParam,
  nameItemDifficultyParam,
  characterIdParam,
  batchSchema,
  bossUpgradesQuery,
} = require('./item_upgrade.validation');

router.get('/', validateQuery(realmScopeQuery), controller.getAll);

// Efface les upgrades d'un royaume (bouton « effacer » de la page Roster).
// Remplace GET /1/update/clear-all-upgrades, public et non cloisonné (SIMS-116).
router.delete(
  '/',
  checkPermission(Permission.EDIT_ROSTER),
  validateQuery(realmRequiredQuery),
  controller.clearRealm,
);

router.post('/batch', validateBody(batchSchema), controller.getBatch);

router.post('/wishlist-batch', validateBody(batchSchema), controller.getWishlistBatch);

router.get(
  '/by-boss/character/:characterId',
  validateParams(characterIdParam),
  validateQuery(bossUpgradesQuery),
  controller.getCharacterBossUpgrades,
);

router.get(
  '/byItem/:itemID/:difficulty',
  validateParams(itemDifficultyParam),
  validateQuery(realmScopeQuery),
  controller.getByItem,
);

router.get(
  '/:name/:itemID/:difficulty',
  validateParams(nameItemDifficultyParam),
  validateQuery(realmScopeQuery),
  controller.getByNameItemDifficulty,
);

module.exports = router;
