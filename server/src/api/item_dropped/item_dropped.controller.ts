import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { CreateLootInput } from './item_dropped.types';
import * as usecases from './usecases';

type LootIdParams = { id: number };

export async function list(req: Request, res: Response) {
  const { instanceId, bossId, assignedTo, realmId } = validated<{
    instanceId: number;
    bossId?: number;
    assignedTo?: number | null;
    realmId?: number;
  }>(req, 'query');

  res.json(await usecases.listInstanceLoots(instanceId, { bossId, assignedTo }, realmId));
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<LootIdParams>(req, 'params');
  res.json(await usecases.getLoot(id));
}

export async function create(req: Request, res: Response) {
  const input = validated<CreateLootInput>(req, 'body');
  res.status(201).json(await usecases.createLoot(input));
}

export async function update(req: Request, res: Response) {
  const { id } = validated<LootIdParams>(req, 'params');
  const { assignedTo, assignedBy } = validated<{
    assignedTo: number | null;
    assignedBy?: number | null;
  }>(req, 'body');

  res.json(await usecases.assignLoot(id, assignedTo, assignedBy));
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<LootIdParams>(req, 'params');
  res.json(await usecases.removeLoot(id));
}
