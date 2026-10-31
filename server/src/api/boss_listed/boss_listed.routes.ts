import express from 'express';

import * as controller from './boss_listed.controller';

const router = express.Router();
const { validateQuery } = require('../../shared/middleware/validate');
const { seasonScopeQuery } = require('./boss_listed.validation');

router.get('/', validateQuery(seasonScopeQuery), controller.list);

module.exports = router;
