import type { Request, Response } from 'express';

import { AppError } from '../../shared/errors/AppError';
import { validated } from '../../shared/middleware/validated';
import type { AttendanceQuery } from './attendance.types';
import * as usecases from './usecases';

/**
 * Les paramètres et la query sont validés et convertis en amont par
 * attendance.validation. Le realmId de la query est celui que checkPermission
 * a vérifié, et le personnage :characterId y est rattaché par checkPermission.
 */

export async function getAttendance(req: Request, res: Response) {
  const query = validated<AttendanceQuery>(req, 'query');
  res.json(await usecases.getAttendanceSummary(query));
}

export async function getCharacterDetail(req: Request, res: Response) {
  const query = validated<AttendanceQuery>(req, 'query');
  const { characterId } = validated<{ characterId: number }>(req, 'params');

  const events = await usecases.getCharacterAttendance({ ...query, characterId });
  res.json({ events });
}

/**
 * Royaume vérifié par checkPermission, monté sur la route. Son absence est une
 * erreur de câblage de la route, pas une erreur du client : seul
 * checkPermission pose `req.realmRole` (injectRealmId pose `req.realmId` sans
 * vérification).
 */
function checkedRealmId(req: Request): number {
  if (!req.realmRole || !req.realmId) {
    throw new AppError('Route without checkPermission: no checked realm', 500, {
      code: 'unchecked_realm',
    });
  }
  return req.realmId;
}

export async function getLootEquity(req: Request, res: Response) {
  const { startDate, endDate, includeOptional } = validated<AttendanceQuery>(req, 'query');
  res.json(
    await usecases.getLootEquity({
      realmId: checkedRealmId(req),
      startDate,
      endDate,
      includeOptional,
    }),
  );
}
