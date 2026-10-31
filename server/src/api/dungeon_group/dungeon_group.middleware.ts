import type { NextFunction, Request } from 'express';

import { validated } from '../../shared/middleware/validated';
import { GroupNotFoundError } from './dungeon_group.errors';
import { groupBelongsToRealm } from './usecases';

/**
 * Vérifie que le groupe ciblé par :id appartient bien au royaume passé en
 * query (validés en amont par groupIdParam et realmScopeQuery), et rejette
 * la requête sinon.
 *
 * Ce contrôle était dupliqué à l'identique dans huit handlers du
 * controller ; le monter comme middleware le garde en un seul endroit et
 * garantit qu'aucune route ne l'oublie.
 *
 * @throws {GroupNotFoundError} si le groupe n'existe pas ou sort du royaume
 */
export async function requireGroupInRealm(req: Request, _res: unknown, next: NextFunction) {
  const { id } = validated<{ id: number }>(req, 'params');
  const { realmId } = validated<{ realmId: number }>(req, 'query');

  if (!(await groupBelongsToRealm(id, realmId))) throw new GroupNotFoundError();

  next();
}
