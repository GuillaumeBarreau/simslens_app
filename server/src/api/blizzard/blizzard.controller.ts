import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import { NoBnetSessionError } from './blizzard.errors';
import type { BnetSession, ClaimCharacterInput, GuildMember } from './blizzard.types';
import * as usecases from './usecases';

/** Session Battle.net de la requête ; 401 si l'utilisateur n'en a pas. */
function bnetSession(req: Request): BnetSession {
  const { token, id } = req.user ?? {};
  if (!token || !id) throw new NoBnetSessionError();
  return { token, userId: id };
}

export async function listMyCharacters(req: Request, res: Response) {
  const session = bnetSession(req);
  const { region } = validated<{ region?: string }>(req, 'query');
  res.json(await usecases.listMyCharacters(session, region || 'eu'));
}

export async function claimByBnet(req: Request, res: Response) {
  const session = bnetSession(req);
  const input = validated<ClaimCharacterInput>(req, 'body');
  res.json(await usecases.claimCharacter(session, input));
}

export async function getGuildRoster(req: Request, res: Response) {
  const session = bnetSession(req);
  const { realm, guild, region } = validated<{ realm: string; guild: string; region?: string }>(
    req,
    'query',
  );
  res.json(await usecases.getGuildRoster(session, realm, guild, region || 'eu'));
}

export async function importGuildMembers(req: Request, res: Response) {
  const { members, region } = validated<{ members: GuildMember[]; region?: string }>(req, 'body');
  // royaume vérifié par checkPermission(EDIT_ROSTER), jamais le corps brut
  const realmId = req.realmId as number;
  res.json(await usecases.importGuildMembers(members, realmId, region || 'EU'));
}
