import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

type ListLogsQuery = { limit?: number; characterName?: string };

/**
 * Le royaume est celui vérifié par checkPermission(Permission.VIEW_ACTIVITY_LOG),
 * pas une valeur relue dans la requête.
 */
export async function getLogs(req: Request, res: Response) {
  const { limit, characterName } = validated<ListLogsQuery>(req, 'query');

  const logs = await usecases.listRealmLogs({
    realmId: req.realmId as number,
    limit,
    characterName: characterName ?? null,
  });

  res.json({ logs });
}
