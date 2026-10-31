import type { Request, Response } from 'express';

import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';

/**
 * Les paramètres, la query et le corps sont validés et convertis en amont
 * par roster.validation. Chaque usecase rattache l'événement :eventId au
 * royaume de la query avant d'agir.
 */

type EventParams = { eventId: number };
type RealmQuery = { realmId: number };
type RealmBossQuery = RealmQuery & { bossId?: number };

export async function getRoster(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId, bossId } = validated<RealmBossQuery>(req, 'query');

  res.json({ roster: await usecases.getEventRoster(eventId, realmId, bossId ?? null) });
}

export async function getPool(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId, bossId } = validated<RealmBossQuery>(req, 'query');

  res.json({ pool: await usecases.getAvailablePool(eventId, realmId, bossId ?? null) });
}

export async function assign(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');
  const { characterId, role, bossId, position } = validated<{
    characterId: number;
    role: string;
    bossId: number;
    position: number;
  }>(req, 'body');

  const assignment = await usecases.assignToRoster(eventId, realmId, {
    characterId,
    role,
    bossId,
    position,
  });
  res.json({ assignment });
}

export async function remove(req: Request, res: Response) {
  const { eventId, characterId } = validated<EventParams & { characterId: number }>(req, 'params');
  const { realmId, bossId } = validated<RealmBossQuery>(req, 'query');

  await usecases.removeFromRoster(eventId, characterId, realmId, bossId ?? null);
  res.json({ message: 'Removed from roster successfully' });
}

export async function reorder(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');
  const { bossId, role, characterIds } = validated<{
    bossId: number;
    role: string;
    characterIds: number[];
  }>(req, 'body');

  await usecases.reorderRoster(eventId, realmId, bossId, role, characterIds);
  res.json({ message: 'Reordered successfully' });
}

export async function copy(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');
  const { sourceBossId, targetBossIds } = validated<{
    sourceBossId: number;
    targetBossIds: number[];
  }>(req, 'body');

  res.json(await usecases.copyRoster(eventId, realmId, sourceBossId, targetBossIds));
}

export async function clearBoss(req: Request, res: Response) {
  const { eventId, bossId } = validated<EventParams & { bossId: number }>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');

  res.json(await usecases.clearBossRoster(eventId, realmId, bossId));
}

export async function getPastRosters(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');

  res.json({ pastRosters: await usecases.getPastEventRosters(eventId, realmId) });
}

export async function getReplacements(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');

  res.json({ vacancies: await usecases.getRosterReplacements(eventId, realmId) });
}

export async function importFromEvent(req: Request, res: Response) {
  const { eventId } = validated<EventParams>(req, 'params');
  const { realmId } = validated<RealmQuery>(req, 'query');
  const { sourceEventId } = validated<{ sourceEventId: number }>(req, 'body');

  res.json(await usecases.importRosterFromEvent(eventId, realmId, sourceEventId));
}
