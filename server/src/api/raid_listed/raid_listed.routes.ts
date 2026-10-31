import express from 'express';

import * as controller from './raid_listed.controller';

const router = express.Router();
const { validateParams, validateQuery } = require('../../shared/middleware/validate');
const { seasonScopeQuery, raidIdParam } = require('./raid_listed.validation');

router.get('/', validateQuery(seasonScopeQuery), controller.list);
router.get('/bosses', validateQuery(seasonScopeQuery), controller.getBosses);
router.get(
  '/:raidId/bosses',
  validateParams(raidIdParam),
  validateQuery(seasonScopeQuery),
  controller.getBossesByRaid,
);

module.exports = router;
