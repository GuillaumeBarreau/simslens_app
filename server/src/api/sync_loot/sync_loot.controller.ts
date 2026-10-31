import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { IngestLootInput } from './sync_loot.types';
import * as usecases from './usecases';

type IngestLootBody = Pick<IngestLootInput, 'realmId' | 'source' | 'entries'>;

/**
 * POST /1/sync/loot — bearer-only ingestion of RCLootCouncil entries.
 *
 * Le corps de la réponse ({ importId, inserted, duplicates, unmatched }) est
 * lu par l'app compagnon (companion/src-tauri/src/api.rs) : ne pas le changer.
 */
export async function ingest(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { realmId, source, entries } = validated<IngestLootBody>(req, 'body');

  const result = await usecases.ingestLoot({
    realmId,
    source,
    entries,
    tokenScopes: req.tokenScopes ?? [],
    userId,
  });

  res.json(result);
}
