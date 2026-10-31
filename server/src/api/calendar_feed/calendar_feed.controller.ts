import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

/**
 * Routes déclarées dans event.routes (montage /1/events). Les routes de
 * gestion agissent sur le flux du joueur connecté ; la route du flux est
 * publique, le jeton de l'URL fait office d'identifiant.
 */

export async function getStatus(req: Request, res: Response) {
  const userId = requireUserId(req);
  res.json(await usecases.getCalendarFeedStatus(userId));
}

export async function regenerate(req: Request, res: Response) {
  const userId = requireUserId(req);
  res.status(201).json(await usecases.regenerateCalendarFeed(userId));
}

export async function revoke(req: Request, res: Response) {
  const userId = requireUserId(req);
  res.json(await usecases.revokeCalendarFeed(userId));
}

export async function feed(req: Request, res: Response) {
  const { file } = validated<{ file: string }>(req, 'params');
  const body = await usecases.renderCalendarFeed(file);

  res
    .type('text/calendar; charset=utf-8')
    .set({
      'Content-Disposition': 'inline; filename="droptimizer.ics"',
      // Contenu propre au joueur : pas de cache partagé.
      'Cache-Control': 'private, max-age=300',
    })
    .send(body);
}
