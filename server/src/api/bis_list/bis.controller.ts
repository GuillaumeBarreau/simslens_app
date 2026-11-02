import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/AppError';
import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { BisScopeQuery, SaveBisSlotInput } from './bis.types';
import * as usecases from './usecases';

/**
 * Royaume vérifié par checkPermission, monté sur la route. Son absence est une
 * erreur de câblage de la route, pas une erreur du client.
 */
function checkedRealmId(req: Request): number {
  if (!req.realmRole || !req.realmId) {
    throw new AppError('Route without checkPermission: no checked realm', 500, {
      code: 'unchecked_realm',
    });
  }
  return req.realmId;
}

export async function get(req: Request, res: Response) {
  const query = validated<BisScopeQuery>(req, 'query');
  res.json(await usecases.getBisList({ ...query, realmId: checkedRealmId(req) }));
}

export async function saveSlot(req: Request, res: Response) {
  const { slot } = validated<{ slot: string }>(req, 'params');
  const input = validated<SaveBisSlotInput>(req, 'body');
  const entries = await usecases.saveBisSlot(checkedRealmId(req), slot, input, requireUserId(req));
  res.json({ slot, entries });
}
