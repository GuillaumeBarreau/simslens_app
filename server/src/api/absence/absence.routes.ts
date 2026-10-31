import express from 'express';

import * as controller from './absence.controller';

const router = express.Router();
const checkPermission = require('../../middleware/checkPermission');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  absenceIdParam,
  realmScopeQuery,
  listAbsencesQuery,
  createAbsenceSchema,
  updateAbsenceSchema,
} = require('./absence.validation');

router.get('/', validateQuery(listAbsencesQuery), controller.list);

router.get(
  '/:id',
  validateParams(absenceIdParam),
  validateQuery(realmScopeQuery),
  controller.getById,
);

router.post(
  '/',
  checkPermission(Permission.SIGNUP_EVENT),
  validateBody(createAbsenceSchema),
  controller.create,
);

router.put(
  '/:id',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(absenceIdParam),
  validateQuery(realmScopeQuery),
  validateBody(updateAbsenceSchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.SIGNUP_EVENT),
  validateParams(absenceIdParam),
  validateQuery(realmScopeQuery),
  controller.remove,
);

module.exports = router;
