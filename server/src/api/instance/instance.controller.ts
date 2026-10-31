import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import type { CreateInstanceInput, UpdateInstanceInput } from './instance.types';
import * as usecases from './usecases';

/**
 * Les routes d'écriture sur /:id passent par checkPermission, qui pose
 * req.realmId : les usecases y rattachent l'instance.
 */

type InstanceParams = { id: number };

/** Royaume vérifié par checkPermission, monté sur toutes les routes d'écriture. */
const checkedRealmId = (req: Request) => req.realmId as number;

export async function list(req: Request, res: Response) {
  const { realmId } = validated<{ realmId?: number }>(req, 'query');
  res.json(await usecases.listInstances(realmId ?? null));
}

export async function getById(req: Request, res: Response) {
  const { id } = validated<InstanceParams>(req, 'params');
  res.json(await usecases.getInstance(id));
}

/**
 * Le royaume de l'instance est celui vérifié par checkPermission : sans lui,
 * le repository retombait sur le premier royaume venu (ensureRealmId).
 */
export async function create(req: Request, res: Response) {
  const input = validated<CreateInstanceInput>(req, 'body');
  res.status(201).json(await usecases.createInstance({ ...input, realmId: checkedRealmId(req) }));
}

export async function update(req: Request, res: Response) {
  const { id } = validated<InstanceParams>(req, 'params');
  const fields = validated<UpdateInstanceInput>(req, 'body');
  res.json(await usecases.updateInstance(id, fields, checkedRealmId(req)));
}

export async function remove(req: Request, res: Response) {
  const { id } = validated<InstanceParams>(req, 'params');
  res.json(await usecases.deleteInstance(id, checkedRealmId(req)));
}

export async function initializeBosses(req: Request, res: Response) {
  const { id } = validated<InstanceParams>(req, 'params');
  const { raidDifficultyId } = validated<{ raidDifficultyId?: number }>(req, 'body');
  res.json(await usecases.initializeInstanceBosses(id, checkedRealmId(req), raidDifficultyId));
}
