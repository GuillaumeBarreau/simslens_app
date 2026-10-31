import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

type TokenItemParams = { itemId: number };

export async function getTokenRewards(req: Request, res: Response) {
  const { itemId } = validated<TokenItemParams>(req, 'params');
  res.json(await usecases.getTokenRewards(itemId));
}

export async function checkIsToken(req: Request, res: Response) {
  const { itemId } = validated<TokenItemParams>(req, 'params');
  res.json({ isToken: await usecases.isToken(itemId) });
}

export async function getAllTokens(_req: Request, res: Response) {
  res.json(await usecases.listAllTokens());
}
