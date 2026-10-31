import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

/**
 * Catalogue des boss, commun à tous les royaumes.
 */
export async function list(req: Request, res: Response) {
  const { extension, season } = validated<{ extension?: string; season?: string }>(req, 'query');
  res.json(await usecases.listBosses(extension, season));
}
