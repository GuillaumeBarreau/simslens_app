import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

/** POST /1/auth/device/code — public, called by the desktop app */
export async function requestDeviceCode(req: Request, res: Response) {
  const { deviceName } = validated<{ deviceName?: string }>(req, 'body');
  res.json(await usecases.requestDeviceCode({ deviceName }));
}

/** POST /1/auth/device/token — public polling endpoint */
export async function exchangeDeviceCode(req: Request, res: Response) {
  const { deviceCode } = validated<{ deviceCode: string }>(req, 'body');
  res.json(await usecases.exchangeDeviceCode({ deviceCode }));
}

/** GET /1/auth/device/pending/:userCode — authenticated, used by the /device page */
export async function describePending(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { userCode } = validated<{ userCode: string }>(req, 'params');
  res.json(await usecases.describePendingApproval({ userCode, userId }));
}

/** POST /1/auth/device/approve — authenticated, called by the /device page */
export async function approveDeviceCode(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { userCode, realmIds } = validated<{ userCode: string; realmIds: number[] }>(req, 'body');
  res.json(await usecases.approveDeviceCode({ userCode, userId, realmIds }));
}

/** GET /1/auth/tokens — list the caller's active tokens */
export async function listMyTokens(req: Request, res: Response) {
  res.json(await usecases.listTokens(requireUserId(req)));
}

/** DELETE /1/auth/tokens/:id — revoke one of the caller's tokens */
export async function revokeMyToken(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id } = validated<{ id: number }>(req, 'params');
  await usecases.revokeToken(id, userId);
  res.status(204).end();
}
