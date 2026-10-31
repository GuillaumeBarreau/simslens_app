import express from 'express';

import * as controller from './item_listed.controller';

const router = express.Router();
const { validateParams } = require('../../shared/middleware/validate');
const { itemIdParam } = require('./item_listed.validation');

router.get('/:itemID', validateParams(itemIdParam), controller.getById);

module.exports = router;
