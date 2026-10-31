import type { Request, Response } from 'express';

import { AppError, ForbiddenError } from '../../shared/errors/AppError';
import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import eventService from './event.service';
import type {
  CreateEventInput,
  CreateEventSeriesInput,
  DuplicateEventOptions,
  ListEventsFilters,
  UpdateEventInput,
  UpdateEventSeriesInput,
} from './event.types';
import * as usecases from './usecases';

/**
 * Le module suit encore le pattern historique : le controller délègue à
 * event.service, à découper en usecases (docs/api/architecture.md).
 */

type EventParams = { id: number };
type RealmScope = { realmId: number };
type SeriesParams = { seriesId: number };

/**
 * Royaume vérifié par checkPermission, monté sur la route. Son absence est une
 * erreur de câblage de la route, pas une erreur du client. `req.realmId` seul
 * ne suffit pas : injectRealmId le pose aussi sans vérification ; seul
 * checkPermission pose `req.realmRole` (cf. character.controller.ts).
 */
function checkedRealmId(req: Request): number {
  if (!req.realmRole || !req.realmId) {
    throw new AppError('Route without checkPermission: no checked realm', 500, {
      code: 'unchecked_realm',
    });
  }
  return req.realmId;
}

export async function list(req: Request, res: Response) {
  const filters = validated<ListEventsFilters>(req, 'query');
  res.json({ events: await eventService.listEvents(filters) });
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json({ event: await eventService.getEventDetails(id, realmId) });
}

export async function create(req: Request, res: Response) {
  const userId = requireUserId(req);
  const input = validated<CreateEventInput>(req, 'body');
  res.status(201).json({ event: await eventService.createEvent(input, userId) });
}

export async function update(req: Request, res: Response) {
  const { id } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  const changes = validated<UpdateEventInput>(req, 'body');
  res.json({ event: await eventService.updateEvent(id, changes, realmId) });
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  const event = await eventService.cancelEvent(id, realmId);
  res.json({ event, message: 'Event cancelled successfully' });
}

export async function duplicate(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  const { title, copySignups } = validated<DuplicateEventOptions>(req, 'body');

  const event = await eventService.duplicateEvent(id, realmId, { title, copySignups }, userId);
  res.status(201).json({ event });
}

export async function createSeries(req: Request, res: Response) {
  const userId = requireUserId(req);
  const input = validated<CreateEventSeriesInput>(req, 'body');
  res.status(201).json(await usecases.createEventSeries(input, checkedRealmId(req), userId));
}

export async function updateSeries(req: Request, res: Response) {
  const { seriesId } = validated<SeriesParams>(req, 'params');
  const input = validated<UpdateEventSeriesInput>(req, 'body');
  res.json(await usecases.updateEventSeries(seriesId, checkedRealmId(req), input));
}

export async function removeSeries(req: Request, res: Response) {
  const { seriesId } = validated<SeriesParams>(req, 'params');
  const { fromDate } = validated<{ fromDate: Date }>(req, 'query');
  res.json(await usecases.deleteEventSeries(seriesId, checkedRealmId(req), fromDate));
}

/**
 * If header `x-acting-discord-tag` is present, the request is treated as being
 * initiated by that Discord user (bot flow) and requires admin/moderator role
 * on the event's realm — even when x-internal-token is supplied.
 */
export async function getNoStatusTags(req: Request, res: Response) {
  const { eventId } = validated<{ eventId: number }>(req, 'params');

  const actingTag = req.get('x-acting-discord-tag');
  if (actingTag && !(await eventService.isDiscordUserAdminOnEvent(eventId, actingTag))) {
    throw new ForbiddenError('forbidden', { code: 'forbidden' });
  }

  res.json({ players: await eventService.getNoStatusDiscordTags(eventId) });
}
