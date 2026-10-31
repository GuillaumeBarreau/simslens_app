import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import { actorFromRequest } from './signup.actingRole';
import type { UpsertSignupInput } from './signup.types';
import * as usecases from './usecases';

type RealmScope = { realmId: number };

export async function upsert(req: Request, res: Response) {
  const { eventId } = validated<{ eventId: number }>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  const body = validated<Omit<UpsertSignupInput, 'eventId'>>(req, 'body');

  const signup = await usecases.upsertSignup({ ...body, eventId }, realmId, actorFromRequest(req));

  res.json({ signup });
}

export async function getRoster(req: Request, res: Response) {
  const { eventId } = validated<{ eventId: number }>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');

  const roster = await usecases.getEventRoster(eventId, realmId);

  res.json({ roster });
}

export async function remove(req: Request, res: Response) {
  const { eventId, characterId } = validated<{ eventId: number; characterId: number }>(
    req,
    'params',
  );
  const { realmId } = validated<RealmScope>(req, 'query');

  const signup = await usecases.deleteSignup(eventId, characterId, realmId, actorFromRequest(req));

  res.json({ signup, message: 'Signup deleted successfully' });
}
