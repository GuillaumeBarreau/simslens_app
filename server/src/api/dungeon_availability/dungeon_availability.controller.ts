import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from './dungeon_availability.types';
import * as usecases from './usecases';

/**
 * `roles` arrive déjà sérialisé en JSON string : voir rolesField.
 */

type AvailabilityParams = { id: number };
type RealmScope = { realmId: number };

export async function list(req: Request, res: Response) {
  const filters = validated<{
    realmId: number;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }>(req, 'query');
  res.json({ availabilities: await usecases.listAvailabilities(filters) });
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<AvailabilityParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  res.json({ availability: await usecases.getAvailabilityForRealm(id, realmId) });
}

export async function create(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { note, ...input } = validated<Omit<CreateAvailabilityInput, 'userId'>>(req, 'body');

  const availability = await usecases.createAvailability({
    ...input,
    userId,
    note: note || null,
  });
  res.status(201).json({ availability });
}

export async function update(req: Request, res: Response) {
  const { id } = validated<AvailabilityParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');
  // Joi ne garde que les champs fournis.
  const changes = validated<UpdateAvailabilityInput>(req, 'body');

  const availability = await usecases.updateAvailabilityForRealm(
    id,
    { realmId, userId: req.user?.id, realmRole: req.realmRole },
    changes,
  );
  res.json({ availability });
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<AvailabilityParams>(req, 'params');
  const { realmId } = validated<RealmScope>(req, 'query');

  const availability = await usecases.removeAvailabilityForRealm(id, {
    realmId,
    userId: req.user?.id,
  });
  res.json({ availability });
}
