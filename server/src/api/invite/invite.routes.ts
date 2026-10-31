import express from 'express';

import * as controller from './invite.controller';

const router = express.Router();
const requireUser = require('../../middleware/requireUser');
const { validateParams } = require('../../shared/middleware/validate');
const { joinCodeParam } = require('./invite.validation');

router.get('/:code', validateParams(joinCodeParam), controller.validateCode);

router.post('/:code/join', requireUser, validateParams(joinCodeParam), controller.joinWithCode);

module.exports = router;
