import express from 'express';

import { validateQuery } from '../../shared/middleware/validate';
import * as controller from './region.controller';
import { listRegionsQuery } from './region.validation';

const router = express.Router();

router.get('/', validateQuery(listRegionsQuery), controller.list);

module.exports = router;
