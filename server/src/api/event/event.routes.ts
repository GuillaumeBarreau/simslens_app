import express from 'express';

import * as calendarFeedController from '../calendar_feed/calendar_feed.controller';
import { maskFeedTokenInUrl } from '../calendar_feed/calendar_feed.middleware';
import { calendarFeedFileParam } from '../calendar_feed/calendar_feed.validation';
import * as controller from './event.controller';

const router = express.Router();

const checkPermission = require('../../middleware/checkPermission');
const requireUser = require('../../middleware/requireUser');
const { Permission } = require('../../shared/config/permissions/permissions');
const { validateBody, validateParams, validateQuery } = require('../../shared/middleware/validate');
const {
  eventIdParam,
  eventIdNamedParam,
  realmScopeQuery,
  listEventsQuery,
  createEventSchema,
  updateEventSchema,
  duplicateEventSchema,
  seriesIdParam,
  createEventSeriesSchema,
  updateEventSeriesSchema,
  deleteEventSeriesQuery,
} = require('./event.validation');

router.get('/', validateQuery(listEventsQuery), controller.list);

/**
 * Flux iCal du joueur (SIMS-204), avant '/:id'. Gestion par le joueur
 * connecté ; le flux lui-même est lu par un agenda, sans session : le jeton
 * de l'URL l'authentifie (exception motivée dans routeGuards.exceptions).
 */
router.get('/calendar-feed', requireUser, calendarFeedController.getStatus);
router.post('/calendar-feed', requireUser, calendarFeedController.regenerate);
router.delete('/calendar-feed', requireUser, calendarFeedController.revoke);
router.get(
  '/calendar-feed/:file',
  // Avant la validation : une erreur 400 journalise aussi l'URL.
  maskFeedTokenInUrl,
  validateParams(calendarFeedFileParam),
  calendarFeedController.feed,
);

// Séries d'événements récurrents (SIMS-200), déclarées avant /:id.
// Le paramètre s'appelle :seriesId, pas :id : checkPermission prendrait un :id
// sous /events pour un identifiant d'événement.
router.post(
  '/series',
  checkPermission(Permission.CREATE_EVENT),
  validateBody(createEventSeriesSchema),
  controller.createSeries,
);

router.put(
  '/series/:seriesId',
  checkPermission(Permission.EDIT_EVENT),
  validateParams(seriesIdParam),
  validateQuery(realmScopeQuery),
  validateBody(updateEventSeriesSchema),
  controller.updateSeries,
);

router.delete(
  '/series/:seriesId',
  checkPermission(Permission.DELETE_EVENT),
  validateParams(seriesIdParam),
  validateQuery(deleteEventSeriesQuery),
  controller.removeSeries,
);

router.get(
  '/:id',
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.getById,
);

router.post(
  '/',
  checkPermission(Permission.CREATE_EVENT),
  validateBody(createEventSchema),
  controller.create,
);

router.put(
  '/:id',
  checkPermission(Permission.EDIT_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(updateEventSchema),
  controller.update,
);

router.delete(
  '/:id',
  checkPermission(Permission.DELETE_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  controller.remove,
);

router.post(
  '/:id/duplicate',
  checkPermission(Permission.CREATE_EVENT),
  validateParams(eventIdParam),
  validateQuery(realmScopeQuery),
  validateBody(duplicateEventSchema),
  controller.duplicate,
);

router.get(
  '/:eventId/no-status-tags',
  checkPermission(Permission.MANAGE_SIGNUPS),
  validateParams(eventIdNamedParam),
  controller.getNoStatusTags,
);

module.exports = router;
