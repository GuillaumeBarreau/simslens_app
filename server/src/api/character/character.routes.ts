import express from 'express';

import checkPermission from '../../middleware/checkPermission';
import requireInternal from '../../middleware/requireInternal';
import requireUser from '../../middleware/requireUser';
import { Permission } from '../../shared/config/permissions/permissions';
import { validateBody, validateParams, validateQuery } from '../../shared/middleware/validate';
import * as controller from './character.controller';
import {
  addOwnCharacterSchema,
  bulkGearQuery,
  characterIdParam,
  characterNameParam,
  checkMountParam,
  classSpecializationsQuery,
  createCharacterSchema,
  discordTagParam,
  idParam,
  keyHistoryQuery,
  listCharactersQuery,
  rosterStatusQuery,
  updateCharacterSchema,
  updateCharacterSpecializationsSchema,
} from './character.validation';

const router = express.Router();

router.get('/', validateQuery(listCharactersQuery), controller.list);

// Données de référence (SIMS-212). Déclarée avant /:id/specializations, que
// « classes » ne doit pas atteindre. `?game=forever` : classes et spés de ce jeu (SIMS-027).
router.get(
  '/classes/specializations',
  requireUser,
  validateQuery(classSpecializationsQuery),
  controller.listClassSpecializations,
);

// Spé principale et off-specs (SIMS-212) : le propriétaire lit et modifie les
// siennes (allowSelfEdit), un officier celles du roster.
router.get(
  '/:id/specializations',
  checkPermission(Permission.VIEW_ROSTER, { allowSelfEdit: true }),
  validateParams(idParam),
  controller.getSpecializations,
);

router.put(
  '/:id/specializations',
  checkPermission(Permission.EDIT_ROSTER, { allowSelfEdit: true }),
  validateParams(idParam),
  validateBody(updateCharacterSpecializationsSchema),
  controller.updateSpecializations,
);

router.get('/roster-status', validateQuery(rosterStatusQuery), controller.rosterStatus);
router.get('/roster', validateQuery(rosterStatusQuery), controller.listRoster);
router.get('/pending', validateQuery(rosterStatusQuery), controller.listPending);

router.get('/gear/bulk', validateQuery(bulkGearQuery), controller.getAllGear);

router.get('/keys/history', validateQuery(keyHistoryQuery), controller.getKeyHistory);

router.get('/:characterId/gear/latest', validateParams(characterIdParam), controller.getLatestGear);

router.get(
  '/:characterId/equipment/blizzard',
  validateParams(characterIdParam),
  controller.getBlizzardEquipment,
);

router.get('/:characterId/mount/:mountId', validateParams(checkMountParam), controller.checkMount);

router.get('/:name', validateParams(characterNameParam), controller.getByName);

// Réservée au bot (inscription par bouton Discord) : un utilisateur ne doit pas
// pouvoir retrouver le personnage de n'importe qui par son tag (SIMS-153).
router.get(
  '/discord/:tag',
  requireInternal,
  validateParams(discordTagParam),
  controller.getByDiscordTag,
);

router.post(
  '/',
  checkPermission(Permission.EDIT_ROSTER),
  validateBody(createCharacterSchema),
  controller.create,
);

// Un joueur ajoute son personnage WoW Forever, sans API Blizzard (SIMS-050) :
// tout membre (ou invité) de la guilde `realmId` du corps. Déclarée avant /:id.
router.post(
  '/own',
  requireUser,
  checkPermission(Permission.SIGNUP_EVENT),
  validateBody(addOwnCharacterSchema),
  controller.addOwn,
);

router.post('/update-all', checkPermission(Permission.EDIT_ROSTER), controller.updateAll);

router.post(
  '/:characterId/sync-blizzard',
  checkPermission(Permission.SYNC_CHARACTERS),
  validateParams(characterIdParam),
  controller.syncFromBlizzard,
);

router.post(
  '/:id',
  checkPermission(Permission.EDIT_ROSTER, { allowSelfEdit: true }),
  validateParams(idParam),
  validateBody(updateCharacterSchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.EDIT_ROSTER),
  validateParams(idParam),
  controller.archive,
);

module.exports = router;
