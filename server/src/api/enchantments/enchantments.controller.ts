import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

export async function getAllEnchantments(_req: Request, res: Response) {
  res.json({ enchantments: await usecases.listEnchantments() });
}

export async function verifyEnchantments(req: Request, res: Response) {
  const { characterId } = validated<{ characterId: number }>(req, 'params');
  res.json(await usecases.getCharacterEnchantmentReport(characterId));
}

export async function verifyBulkEnchantments(req: Request, res: Response) {
  const { ids } = validated<{ ids: number[] }>(req, 'query');
  res.json(await usecases.verifyBulkCharacterEnchantments(ids));
}
