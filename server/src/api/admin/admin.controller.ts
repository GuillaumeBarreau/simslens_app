import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';
import type { CreateSubscriptionInput } from './usecases/manageRealms';

type RealmIdParams = { id: number };

export async function getStats(_req: Request, res: Response) {
  res.json(await usecases.getServerStats());
}

export async function getRealms(_req: Request, res: Response) {
  res.json(await usecases.listRealms());
}

export async function getRealmSubscriptions(req: Request, res: Response) {
  const { id } = validated<RealmIdParams>(req, 'params');
  res.json(await usecases.listRealmSubscriptions(id));
}

export async function createRealmSubscription(req: Request, res: Response) {
  const { id } = validated<RealmIdParams>(req, 'params');
  const input = validated<CreateSubscriptionInput>(req, 'body');
  res.status(201).json(await usecases.createRealmSubscription(id, input));
}

export async function getRealmCharacters(req: Request, res: Response) {
  const { id } = validated<RealmIdParams>(req, 'params');
  res.json(await usecases.listRealmCharacters(id));
}
