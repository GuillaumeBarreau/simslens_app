import express from 'express';

import * as controller from './item_tokens.controller';

const router = express.Router();
const { validateParams } = require('../../shared/middleware/validate');
const { tokenItemParam } = require('./item_tokens.validation');

router.get(
  '/items/:itemId/token-rewards',
  validateParams(tokenItemParam),
  controller.getTokenRewards,
);

router.get('/items/:itemId/is-token', validateParams(tokenItemParam), controller.checkIsToken);

router.get('/tokens', controller.getAllTokens);

module.exports = router;
