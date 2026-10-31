import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import importService from './item_import.service';

/**
 * Le module suit encore le pattern historique : le controller délègue à
 * item_import.service (docs/api/architecture.md). Le royaume lu ici est celui
 * que checkPermission a vérifié : il doit concorder avec toute autre source.
 */

type UploadBody = {
  filename?: string;
  rows: Record<string, unknown>[];
  realmId: number;
  extension?: string;
  season?: string;
  instanceId?: number;
};

type BulkLootsQuery = {
  all: boolean;
  characterIds?: number[];
  realmId: number;
};

/**
 * Royaume vérifié par checkPermission(IMPORT_SIMC) ; l'import est toujours tracé.
 */
export async function upload(req: Request, res: Response) {
  const { filename, rows, realmId, extension, season, instanceId } = validated<UploadBody>(
    req,
    'body',
  );
  // Le bot n'a pas d'utilisateur : l'import est alors fait sans journal d'activité.
  const actorInfo = { userId: req.user?.id ?? null, realmId };

  res.json(
    await importService.processImport({
      filename,
      rows,
      realmId,
      extension,
      season,
      instanceId,
      actorInfo,
    }),
  );
}

/**
 * Royaume vérifié par checkPermission(VIEW_LOOT_HISTORY).
 */
export async function getLootsBulk(req: Request, res: Response) {
  const { all, characterIds, realmId } = validated<BulkLootsQuery>(req, 'query');
  res.json(
    await importService.getLootsGroupedByCharacter({
      characterIds: all ? null : (characterIds ?? null),
      realmId,
    }),
  );
}
