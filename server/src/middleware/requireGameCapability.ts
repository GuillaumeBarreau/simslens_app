import type { NextFunction, Request, Response } from 'express';

import realmRepo from '../api/realm/realm.repository';
import { type GameCapability, type GameId, hasCapability } from '../shared/game/games';

/**
 * Refuse une requête dont la guilde n'a pas la capacité demandée pour son jeu
 * (SIMS-025) : une guilde Forever n'a pas de sims Droptimizer ni de Mythic+,
 * une guilde Retail pas d'attunements ni de listes BiS.
 *
 * À monter après checkPermission, qui pose `req.realmId` (guilde vérifiée).
 */
export function requireGameCapability(capability: GameCapability) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.realmId) {
      return res.status(400).json({ error: 'Realm Context Missing' });
    }
    try {
      const realm = await realmRepo.getRealmById(req.realmId);
      if (!realm) {
        return res.status(404).json({ error: 'Realm not found' });
      }
      if (!hasCapability(realm.game as GameId, capability)) {
        return res.status(409).json({
          error: `Unavailable for this game (${realm.game}): ${capability}`,
          code: 'GAME_CAPABILITY_UNAVAILABLE',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default requireGameCapability;
