import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/AppError';
import { validated } from '../../shared/middleware/validated';
import { ATTUNEMENTS } from './attunement.definitions';
import type { SaveAttunementInput } from './attunement.types';
import * as usecases from './usecases';

type CharacterAttunementParams = { characterId: number; attunement: string };

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

export function definitions(_req: Request, res: Response) {
  res.json({ attunements: Object.values(ATTUNEMENTS) });
}

export async function list(req: Request, res: Response) {
  res.json({ characters: await usecases.listRealmAttunements(checkedRealmId(req)) });
}

export async function save(req: Request, res: Response) {
  const { characterId, attunement } = validated<CharacterAttunementParams>(req, 'params');
  const input = validated<SaveAttunementInput>(req, 'body');
  res.json(await usecases.saveAttunement(characterId, checkedRealmId(req), attunement, input));
}
