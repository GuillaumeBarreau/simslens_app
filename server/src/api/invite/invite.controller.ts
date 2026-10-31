import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

/**
 * Deux points d'entrée partagent ce controller : les routes publiques
 * /1/invites/:code et les routes /1/realms/:id/invites réservées aux
 * responsables du royaume.
 */

type RealmParams = { id: number };
type CodeParams = { code: string };

export async function createCode(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id: realmId } = validated<RealmParams>(req, 'params');
  const { expiresAt, maxUses } = validated<{ expiresAt?: Date | null; maxUses?: number }>(
    req,
    'body',
  );

  res.status(201).json(await usecases.createInviteCode(realmId, userId, { expiresAt, maxUses }));
}

export async function listCodes(req: Request, res: Response) {
  const { id: realmId } = validated<RealmParams>(req, 'params');
  res.json(await usecases.listInviteCodes(realmId));
}

export async function deleteCode(req: Request, res: Response) {
  const { id: realmId, codeId } = validated<RealmParams & { codeId: number }>(req, 'params');
  await usecases.deleteInviteCode(realmId, codeId);
  res.status(204).end();
}

export async function listGuests(req: Request, res: Response) {
  const { id: realmId } = validated<RealmParams>(req, 'params');
  res.json(await usecases.listGuestMembers(realmId));
}

export async function removeGuest(req: Request, res: Response) {
  const { id: realmId, guestId } = validated<RealmParams & { guestId: number }>(req, 'params');
  await usecases.removeGuestMember(realmId, guestId);
  res.status(204).end();
}

export async function validateCode(req: Request, res: Response) {
  const { code } = validated<CodeParams>(req, 'params');
  res.json(await usecases.validateInviteCode(code));
}

export async function joinWithCode(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { code } = validated<CodeParams>(req, 'params');
  res.json(await usecases.joinRealmAsGuest(code, userId));
}
