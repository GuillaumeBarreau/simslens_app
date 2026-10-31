import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import { ItemBnetSessionRequiredError } from './item.errors';
import * as usecases from './usecases';

/**
 * La fiche est lue avec le jeton de l'application, mais la route reste
 * réservée aux sessions Battle.net, comme avant sa mise en forme.
 */
export async function getItemById(req: Request, res: Response) {
  if (!req.user?.token) throw new ItemBnetSessionRequiredError();

  const { itemId } = validated<{ itemId: number }>(req, 'params');
  const { region } = validated<{ region: string }>(req, 'query');

  res.json(await usecases.getItemById(itemId, region));
}
