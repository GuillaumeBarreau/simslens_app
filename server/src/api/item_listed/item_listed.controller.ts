import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

export async function getById(req: Request, res: Response) {
  const { itemID } = validated<{ itemID: number }>(req, 'params');
  res.json(await usecases.getItemById(itemID));
}
