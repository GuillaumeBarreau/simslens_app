const express = require('express');
const router = express.Router();
const ctrl = require('./bossKilled.controller');

router.get('/instance/:instanceId', ctrl.list);
router.put('/:id/kill', ctrl.updateKill);

module.exports = router;
