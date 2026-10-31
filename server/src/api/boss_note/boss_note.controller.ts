import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/AppError';
import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { SaveBossNoteInput } from './boss_note.types';
import * as usecases from './usecases';

/**
 * checkPermission rattache l'événement :eventId au royaume vérifié
 * (req.realmId) ; les usecases le contrôlent à nouveau pour un événement
 * introuvable, que checkPermission laisse passer.
 */

type EventParams = { eventId: number };
type EventBossParams = EventParams & { bossId: number };

/**
 * Royaume vérifié par checkPermission, monté sur la route. Son absence est une
 * erreur de câblage de la route, pas une erreur du client : seul
 * checkPermission pose `req.realmRole` (injectRealmId pose `req.realmId` sans
 * vérification).
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
  const { eventId } = validated<EventParams>(req, 'params');
  res.json({ notes: await usecases.listBossNotes(eventId, checkedRealmId(req)) });
}

/**
 * Remplace la note et les assignations d'un boss (note vidée : supprimée)
 */
export async function save(req: Request, res: Response) {
  const { eventId, bossId } = validated<EventBossParams>(req, 'params');
  const input = validated<SaveBossNoteInput>(req, 'body');

  const note = await usecases.saveBossNote({
    eventId,
    bossId,
    realmId: checkedRealmId(req),
    userId: requireUserId(req),
    input,
  });
  res.json({ note });
}
