import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import type { SaveLoadoutBody } from './talent.types';
import * as usecases from './usecases';

type CharacterParams = { id: number };
type SpecQuery = { specId: number };

export async function getTalentTree(req: Request, res: Response) {
  const { specId } = validated<SpecQuery>(req, 'query');
  res.json(await usecases.getTalentTree(specId));
}

export async function getLoadout(req: Request, res: Response) {
  const { id } = validated<CharacterParams>(req, 'params');
  const { specId } = validated<SpecQuery>(req, 'query');
  res.json(await usecases.getLoadout(id, specId));
}

/**
 * Réservé à un joueur connecté : un appel du bot est refusé (401).
 */
export async function saveLoadout(req: Request, res: Response) {
  requireUserId(req);
  const { id } = validated<CharacterParams>(req, 'params');
  const { specializationId, selectedNodes, exportString, label } = validated<SaveLoadoutBody>(
    req,
    'body',
  );

  const loadout = await usecases.saveLoadout(id, specializationId, {
    selectedNodes,
    exportString,
    label,
  });
  res.json({ success: true, updatedAt: loadout.updatedAt });
}

/**
 * Réservé à un joueur connecté : un appel du bot est refusé (401).
 */
export async function importFromBlizzard(req: Request, res: Response) {
  requireUserId(req);
  const { id } = validated<CharacterParams>(req, 'params');
  const { specializationId } = validated<{ specializationId: number }>(req, 'body');

  const loadout = await usecases.importFromBlizzard(id, specializationId);
  res.json({
    success: true,
    selectedNodes: loadout.selectedNodes,
    exportString: loadout.exportString,
    updatedAt: loadout.updatedAt,
  });
}
