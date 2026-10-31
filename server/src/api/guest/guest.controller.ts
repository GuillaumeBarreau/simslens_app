import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { AddGuestInput } from './guest.types';
import * as usecases from './usecases';

/**
 * L'événement :eventId est rattaché au royaume par checkPermission ; les
 * usecases rattachent l'invité :guestId à cet événement.
 */

type EventParams = { eventId: number };
type GuestParams = EventParams & { guestId: number };
type AssignmentParams = GuestParams & { bossId: number };

export async function add(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const query = validated<{ realmId?: number }>(req, 'query');
  const body = validated<Omit<AddGuestInput, 'eventId'>>(req, 'body');

  const guest = await usecases.addGuest({
    ...body,
    eventId,
    // realmId peut venir de la query ou du corps (cf. guest.validation).
    realmId: query.realmId ?? body.realmId,
  });
  res.status(201).json({ guest });
}

export async function remove(req: Request, res: Response) {
  const { eventId, guestId } = validated<GuestParams>(req, 'params');
  await usecases.removeGuest(guestId, eventId);
  res.status(204).send();
}

export async function getAssignments(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  res.json({ assignments: await usecases.listAssignments(eventId) });
}

export async function upsertAssignment(req: Request, res: Response) {
  const { eventId, guestId, bossId } = validated<AssignmentParams>(req, 'params');
  const { role } = validated<{ role: string }>(req, 'body');

  const assignment = await usecases.assignGuestToBoss({ eventId, guestId, bossId, role });
  res.json({ assignment });
}

export async function removeAssignment(req: Request, res: Response) {
  const { eventId, guestId, bossId } = validated<AssignmentParams>(req, 'params');
  await usecases.unassignGuestFromBoss({ eventId, guestId, bossId });
  res.status(204).send();
}
