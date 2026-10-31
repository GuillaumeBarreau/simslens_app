const express = require('express');
const router = express.Router();
const clerkAuth = require('../../middleware/clerkAuth');
const controller = require('./admin.controller');
const { validateBody, validateParams } = require('../../shared/middleware/validate');
const { realmIdParam, createSubscriptionSchema } = require('./admin.validation');

router.use(clerkAuth);

router.get('/stats', controller.getStats);
router.get('/realms', controller.getRealms);

router.get('/realms/:id/characters', validateParams(realmIdParam), controller.getRealmCharacters);

router.get(
  '/realms/:id/subscriptions',
  validateParams(realmIdParam),
  controller.getRealmSubscriptions,
);

router.post(
  '/realms/:id/subscriptions',
  validateParams(realmIdParam),
  validateBody(createSubscriptionSchema),
  controller.createRealmSubscription,
);

module.exports = router;
