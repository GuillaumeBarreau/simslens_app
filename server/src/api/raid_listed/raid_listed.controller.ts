import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { SeasonScope } from './raid_listed.constants';
import * as usecases from './usecases';

export async function list(req: Request, res: Response) {
  const { extension, season } = validated<SeasonScope>(req, 'query');
  res.json(await usecases.listRaidDifficultyPairs(extension, season));
}

export async function getBosses(req: Request, res: Response) {
  res.json(await usecases.getBossesByRaid(undefined, validated<SeasonScope>(req, 'query')));
}

export async function getBossesByRaid(req: Request, res: Response) {
  const { raidId } = validated<{ raidId: number }>(req, 'params');
  res.json(await usecases.getBossesByRaid(raidId, validated<SeasonScope>(req, 'query')));
}
