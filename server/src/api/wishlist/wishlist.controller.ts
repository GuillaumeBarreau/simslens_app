import type { Request, Response } from 'express';

import { requireUserId } from '../../shared/http/requestUser';
import { validated } from '../../shared/middleware/validated';
import * as usecases from './usecases';
import type {
  CopyWishlistFromCharacterInput,
  UpdateWishlistItemInput,
  WishlistSlotAlternativesQuery,
  WishlistStatusQuery,
} from './wishlist.types';

type CharacterParams = { id: number };

export async function getWishlist(req: Request, res: Response) {
  const { id } = validated<CharacterParams>(req, 'params');
  const { specializationId } = validated<{ specializationId: number }>(req, 'query');
  res.json(await usecases.getWishlist(id, specializationId));
}

/**
 * GET /characters/:id/wishlist/status?specializationId=&difficulty=
 * Vœux déjà portés ou battus par l'équipement actuel (SIMS-205).
 * Royaume vérifié par checkPermission.
 */
export async function getWishlistStatus(req: Request, res: Response) {
  const { id } = validated<CharacterParams>(req, 'params');
  const { specializationId, difficulty } = validated<WishlistStatusQuery>(req, 'query');
  res.json(
    await usecases.getWishlistStatus(id, specializationId, difficulty, req.realmId as number),
  );
}

/**
 * GET /characters/:id/wishlist/:slot/alternatives?specializationId=&difficulty=&extension=&season=
 * Objets de raid du même emplacement avec leur gain simulé et leur boss (SIMS-205).
 * Royaume vérifié par checkPermission.
 */
export async function getWishlistSlotAlternatives(req: Request, res: Response) {
  const { id, slot } = validated<CharacterParams & { slot: string }>(req, 'params');
  const query = validated<WishlistSlotAlternativesQuery>(req, 'query');
  res.json(await usecases.getWishlistSlotAlternatives(id, slot, query, req.realmId as number));
}

export async function getCharacterSpecs(req: Request, res: Response) {
  const { id } = validated<CharacterParams>(req, 'params');
  res.json(await usecases.getCharacterSpecs(id));
}

export async function updateWishlistItem(req: Request, res: Response) {
  const userId = requireUserId(req);
  const { id, slot } = validated<CharacterParams & { slot: string }>(req, 'params');
  const { specializationId, itemId, priority } = validated<UpdateWishlistItemInput>(req, 'body');

  await usecases.updateWishlistItem(id, specializationId, slot, itemId, priority, userId);
  res.json({ success: true });
}

export async function getAvailableItems(req: Request, res: Response) {
  const { extension, season, slot } = validated<{
    extension: string;
    season: string;
    slot: string;
  }>(req, 'params');
  const { classId, specName } = validated<{ classId?: number; specName?: string }>(req, 'query');

  res.json(
    await usecases.getAvailableItems(slot, extension, season, classId ?? null, specName || null),
  );
}

/**
 * GET /roster/:region/:guildName
 * Royaume résolu et vérifié par checkPermission.
 */
export async function getRosterWishlists(req: Request, res: Response) {
  res.json(await usecases.getRosterWishlists(req.realmId as number));
}

/**
 * GET /roster/:region/:guildName/wishlist-hidden-specs
 * Wishlists d'autres spés que celle affichée, à signaler (SIMS-212).
 * Royaume résolu et vérifié par checkPermission.
 */
export async function getRosterHiddenSpecWishlists(req: Request, res: Response) {
  res.json(await usecases.getRosterHiddenSpecWishlists(req.realmId as number));
}

/**
 * GET /roster/:region/:guildName/wishlist-completion
 * Royaume résolu et vérifié par checkPermission.
 */
export async function getRosterWishlistCompletion(req: Request, res: Response) {
  res.json(await usecases.getRosterWishlistCompletion(req.realmId as number));
}

export async function copyWishlistFromCharacter(req: Request, res: Response) {
  requireUserId(req);
  const { id, sourceId } = validated<CharacterParams & { sourceId: number }>(req, 'params');
  const { targetSpecializationId, sourceSpecializationId } =
    validated<CopyWishlistFromCharacterInput>(req, 'body');

  res.json(
    await usecases.copyWishlistFromCharacter(
      id,
      targetSpecializationId,
      sourceId,
      sourceSpecializationId,
      req.realmId as number,
    ),
  );
}
