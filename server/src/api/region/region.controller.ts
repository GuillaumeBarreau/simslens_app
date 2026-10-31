import type { Request, Response } from 'express';

import * as usecases from './usecases';

export async function list(_req: Request, res: Response) {
  res.json(await usecases.listRegionsWithServers());
}
