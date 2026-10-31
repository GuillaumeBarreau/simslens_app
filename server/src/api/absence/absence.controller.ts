import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { CreateAbsenceInput, UpdateAbsenceInput } from './absence.types';
import * as usecases from './usecases';

type AbsenceParams = { id: number };
type RealmScope = { realmId: number };

export async function list(req: Request, res: Response) {
  const filters = validated<{
    realmId: number;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }>(req, 'query');
  res.json({ absences: await usecases.listAbsences(filters) });
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<AbsenceParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json({ absence: await usecases.getAbsenceForRealm(id, realmId) });
}

export async function create(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { realmId, startDate, endDate, reason } = validated<Omit<CreateAbsenceInput, 'userId'>>(
    req,
    'body',
  );

  const absence = await usecases.createAbsence({
    userId,
    realmId,
    startDate,
    endDate,
    reason: reason || null,
  });
  res.status(201).json({ absence });
}

export async function update(req: Request, res: Response) {
  const { id } = validated<AbsenceParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  // Joi ne garde que les champs fournis : startDate, endDate et/ou reason.
  const changes = validated<UpdateAbsenceInput>(req, 'body');

  const absence = await usecases.updateAbsenceForRealm(
    id,
    { realmId, userId: req.user?.id },
    changes,
  );
  res.json({ absence });
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<AbsenceParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');

  const absence = await usecases.removeAbsenceForRealm(id, { realmId, userId: req.user?.id });
  res.json({ absence });
}
