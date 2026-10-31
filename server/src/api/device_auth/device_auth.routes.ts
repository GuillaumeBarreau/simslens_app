import express from 'express';

import * as controller from './device_auth.controller';

const router = express.Router();
const { validateBody, validateParams } = require('../../shared/middleware/validate');
const {
  requestDeviceCodeSchema,
  exchangeDeviceCodeSchema,
  userCodeParam,
  approveDeviceCodeSchema,
  tokenIdParam,
} = require('./device_auth.validation');

router.post('/device/code', validateBody(requestDeviceCodeSchema), controller.requestDeviceCode);

router.post('/device/token', validateBody(exchangeDeviceCodeSchema), controller.exchangeDeviceCode);

router.get('/device/pending/:userCode', validateParams(userCodeParam), controller.describePending);

router.post('/device/approve', validateBody(approveDeviceCodeSchema), controller.approveDeviceCode);

router.get('/tokens', controller.listMyTokens);
router.delete('/tokens/:id', validateParams(tokenIdParam), controller.revokeMyToken);

module.exports = router;
