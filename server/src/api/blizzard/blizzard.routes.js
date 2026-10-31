const express = require('express');
const router = express.Router();
const controller = require('./blizzard.controller');
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateQuery } = require('../../shared/middleware/validate');
const {
  listCharactersQuery,
  claimCharacterSchema,
  guildRosterQuery,
  importGuildMembersSchema,
} = require('./blizzard.validation');

router.get('/characters', validateQuery(listCharactersQuery), controller.listMyCharacters);

router.post('/claim', validateBody(claimCharacterSchema), controller.claimByBnet);

// Lecture et import du roster de guilde : réservés à edit_roster sur le royaume,
// comme dans le front (RosterActionBar). SIMS-126.
router.get(
  '/guild/roster',
  checkPermission(Permission.EDIT_ROSTER),
  validateQuery(guildRosterQuery),
  controller.getGuildRoster,
);

router.post(
  '/guild/import',
  checkPermission(Permission.EDIT_ROSTER),
  validateBody(importGuildMembersSchema),
  controller.importGuildMembers,
);

module.exports = router;
