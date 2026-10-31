import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';
import type { ValidationSettingsUpdate } from './validation_settings.types';

/**
 * Le royaume :realmId de l'URL est rattaché par les usecases à celui que
 * checkPermission a vérifié (req.realmId) : SIMS-137.
 */

type RealmParams = { realmId: number };

export async function getSettings(req: Request, res: Response) {
  const { realmId } = validated<RealmParams>(req, 'params');
  res.json(await usecases.getValidationSettings({ realmId, checkedRealmId: req.realmId }));
}

export async function updateSettings(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { realmId } = validated<RealmParams>(req, 'params');
  const settings = validated<ValidationSettingsUpdate>(req, 'body');

  res.json(
    await usecases.updateValidationSettings({
      realmId,
      checkedRealmId: req.realmId,
      settings,
      requesterId,
    }),
  );
}
