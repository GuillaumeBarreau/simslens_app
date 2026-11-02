import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { ListRegionsQuery } from './region.types';
import * as usecases from './usecases';

export async function list(req: Request, res: Response) {
  const { game } = validated<ListRegionsQuery>(req, 'query');
  res.json(await usecases.listRegionsWithServers(game));
}
