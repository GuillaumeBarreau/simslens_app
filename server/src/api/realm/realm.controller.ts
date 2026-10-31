import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { RealmSettings } from './realm.types';
import * as usecases from './usecases';

/**
 * Les routes /:id recopient :id dans :realmId pour checkPermission
 * (cf. realm.routes) ; les paramètres et corps sont validés par
 * realm.validation.
 */

type RealmParams = { id: number };
type OwnerParams = RealmParams & { ownerId: string };

export async function list(_req: Request, res: Response) {
  res.json(await usecases.listRealms());
}

export async function create(req: Request, res: Response) {
  const ownerId = requireUserId(req);
  const { name, server, region } = validated<{ name: string; server: string; region: string }>(
    req,
    'body',
  );

  const result = await usecases.createRealm({
    name,
    server,
    region,
    ownerId,
    userToken: req.user?.token,
  });
  res.status(201).json(result);
}

export async function get(req: Request, res: Response) {
  const { id } = validated<RealmParams>(req, 'params');
  res.json(await usecases.getRealm(id));
}

export async function addCharacter(req: Request, res: Response) {
  const { id: realmId } = validated<RealmParams>(req, 'params');
  const { characterId } = validated<{ characterId: number }>(req, 'body');

  res.json(await usecases.addCharacter(realmId, characterId));
}

/**
 * Sans session, répond `{ realm: null }` plutôt qu'un 401 (cf. checkUserRealm).
 */
export async function check(req: Request, res: Response) {
  res.json(await usecases.checkUserRealm(req.user?.id));
}

export async function getOwners(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');

  res.json(await usecases.getRealmOwners(realmId, requesterId));
}

export async function addOwner(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');
  const { ownerId, role } = validated<{ ownerId: string; role: string }>(req, 'body');

  res.status(201).json(await usecases.addRealmOwner(realmId, ownerId, role, requesterId));
}

export async function removeOwner(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId, ownerId } = validated<OwnerParams>(req, 'params');

  res.json(await usecases.removeRealmOwner(realmId, ownerId, requesterId));
}

export async function updateOwnerRole(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId, ownerId } = validated<OwnerParams>(req, 'params');
  const { role } = validated<{ role: string }>(req, 'body');

  res.json(await usecases.updateRealmOwnerRole(realmId, ownerId, role, requesterId));
}

export async function getUsers(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');

  res.json(await usecases.getRealmUsers(realmId, requesterId));
}

export async function updateSettings(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');
  const settings = validated<RealmSettings>(req, 'body');

  res.json(await usecases.updateRealmSettings(realmId, settings, requesterId));
}

export async function getMyPermissions(req: Request, res: Response) {
  const requesterId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');

  res.json(await usecases.getUserPermissions(realmId, requesterId));
}
