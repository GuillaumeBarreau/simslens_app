import express from 'express';

import * as controller from './region.controller';

const router = express.Router();

router.get('/', controller.list);

module.exports = router;
