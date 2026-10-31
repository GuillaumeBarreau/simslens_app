import express from 'express';

import * as controller from './item.controller';

const router = express.Router();
const { validateParams, validateQuery } = require('../../shared/middleware/validate');
const { itemIdParam, itemQuery } = require('./item.validation');

router.get(
  '/:itemId',
  validateParams(itemIdParam),
  validateQuery(itemQuery),
  controller.getItemById,
);

module.exports = router;
