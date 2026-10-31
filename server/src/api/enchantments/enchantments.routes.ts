import express from 'express';

import {
  getAllEnchantments,
  verifyBulkEnchantments,
  verifyEnchantments,
} from './enchantments.controller';

const router = express.Router();
const { validateParams, validateQuery } = require('../../shared/middleware/validate');
const { characterIdParam, bulkVerifyQuery } = require('./enchantments.validation');

router.get('/', getAllEnchantments);

router.get('/verify/bulk', validateQuery(bulkVerifyQuery), verifyBulkEnchantments);

router.get('/verify/:characterId', validateParams(characterIdParam), verifyEnchantments);

module.exports = router;
