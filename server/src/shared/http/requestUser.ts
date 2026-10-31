import type { Request } from 'express';

import { UnauthorizedError } from '../errors/AppError';

/**
 * Identifiant de l'utilisateur connecté.
 *
 * checkPermission laisse aussi passer les appels internes du bot, qui n'ont
 * pas d'utilisateur : une route qui agit au nom d'un joueur doit l'exiger.
 *
 * @throws {UnauthorizedError} sans utilisateur sur la requête
 */
export function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError();
  return userId;
}
