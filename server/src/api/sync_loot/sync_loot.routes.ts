import express from 'express';

import * as controller from './sync_loot.controller';

const router = express.Router();
const { requireBearer, requireScope } = require('../../middleware/requireBearer');
const { validateBody } = require('../../shared/middleware/validate');
const { ingestLootSchema } = require('./sync_loot.validation');

// `realm:<id>` scope and the token owner's role are checked inside the use case
// because they depend on the body.
router.post(
  '/loot',
  requireBearer,
  requireScope('sync:loot:write'),
  validateBody(ingestLootSchema),
  controller.ingest,
);

module.exports = router;
