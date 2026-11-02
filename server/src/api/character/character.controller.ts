import type { Request, Response } from 'express';

import { Permission } from '../../shared/config/permissions/permissions';
import { AppError } from '../../shared/errors/AppError';
import type { GameId } from '../../shared/game/games';
import { validated } from '../../shared/middleware/validated';
import { roleHasPermission } from '../../shared/realmRolePermissions';
import type {
  AddOwnCharacterInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  UpdateCharacterSpecializationsInput,
} from './character.types';
import * as usecases from './usecases';

/**
 * Les routes :id et :characterId protégées par checkPermission y rattachent
 * le personnage au royaume vérifié (req.realmId) ; les usecases d'écriture le
 * contrôlent à nouveau pour un personnage sans royaume (character.access).
 */

type CharacterIdParams = { characterId: number };
type IdParams = { id: number };
type RosterQuery = { includePending?: string; realmId?: number };
type ClassSpecializationsQuery = { game?: GameId };

/**
 * Royaume vérifié par checkPermission, monté sur la route. Son absence est une
 * erreur de câblage de la route, pas une erreur du client.
 *
 * `req.realmId` seul ne suffit pas : injectRealmId, monté sur toute l'app, le
 * pose aussi à partir de la query ou du corps, sans vérification. Seul
 * checkPermission pose `req.realmRole`, preuve que le royaume a été contrôlé.
 */
function checkedRealmId(req: Request): number {
  if (!req.realmRole || !req.realmId) {
    throw new AppError('Route without checkPermission: no checked realm', 500, {
      code: 'unchecked_realm',
    });
  }
  return req.realmId;
}

const isTruthyFlag = (value?: string) => value === '1' || value === 'true';

export async function list(req: Request, res: Response) {
  const { realmId } = validated<{ realmId?: number }>(req, 'query');
  res.json(await usecases.listCharacters(realmId));
}

export async function rosterStatus(req: Request, res: Response) {
  const { includePending, realmId } = validated<RosterQuery>(req, 'query');
  res.json(
    await usecases.listRosterStatus({ includePending: isTruthyFlag(includePending), realmId }),
  );
}

export async function listRoster(req: Request, res: Response) {
  const { realmId } = validated<RosterQuery>(req, 'query');
  res.json(await usecases.listRosterStatus({ includePending: false, realmId }));
}

export async function listPending(req: Request, res: Response) {
  const { realmId } = validated<RosterQuery>(req, 'query');
  res.json(await usecases.listPendingRoster({ realmId }));
}

export async function getByName(req: Request, res: Response) {
  const { name } = validated<{ name: string }>(req, 'params');
  res.json(await usecases.getCharacterByName(name));
}

export async function getByDiscordTag(req: Request, res: Response) {
  const { tag } = validated<{ tag: string }>(req, 'params');
  res.json(await usecases.getCharacterByDiscordTag(tag));
}

export async function create(req: Request, res: Response) {
  const input = validated<CreateCharacterInput>(req, 'body');
  res.status(201).json(await usecases.createCharacter(input));
}

/**
 * Un joueur ajoute son personnage WoW Forever (SIMS-050) : rattaché à la guilde
 * vérifiée par checkPermission et à l'utilisateur de la session (requireUser).
 */
export async function addOwn(req: Request, res: Response) {
  const input = validated<AddOwnCharacterInput>(req, 'body');
  const realmId = checkedRealmId(req);
  res.status(201).json(await usecases.addOwnCharacter(realmId, String(req.user?.id), input));
}

/**
 * La route accepte aussi le propriétaire du personnage (allowSelfEdit) : sans
 * EDIT_ROSTER par son rôle, il est en self-edit et certains champs lui sont
 * fermés (SIMS-196).
 */
export async function update(req: Request, res: Response) {
  const { id } = validated<IdParams>(req, 'params');
  const input = validated<UpdateCharacterInput>(req, 'body');
  const realmId = checkedRealmId(req);
  const selfEdit = !roleHasPermission(req.realmRole, Permission.EDIT_ROSTER);
  res.json(await usecases.updateCharacter(id, realmId, input, { selfEdit }));
}

export async function listClassSpecializations(req: Request, res: Response) {
  const { game } = validated<ClassSpecializationsQuery>(req, 'query');
  res.json(await usecases.listClassSpecializations(game));
}

export async function getSpecializations(req: Request, res: Response) {
  const { id } = validated<IdParams>(req, 'params');
  res.json(await usecases.getCharacterSpecializations(id, checkedRealmId(req)));
}

/**
 * Ouverte au propriétaire (allowSelfEdit) : la spé n'est pas un champ réservé
 * aux officiers (SIMS-196).
 */
export async function updateSpecializations(req: Request, res: Response) {
  const { id } = validated<IdParams>(req, 'params');
  const input = validated<UpdateCharacterSpecializationsInput>(req, 'body');
  res.json(await usecases.updateCharacterSpecializations(id, checkedRealmId(req), input));
}

export async function archive(req: Request, res: Response) {
  const { id } = validated<IdParams>(req, 'params');
  res.json(await usecases.archiveCharacter(id, checkedRealmId(req)));
}

/**
 * Met à jour les personnages du royaume vérifié par checkPermission, jamais
 * ceux d'un royaume lu dans le corps brut.
 */
export async function updateAll(req: Request, res: Response) {
  const result = await usecases.updateAllCharacters({
    concurrency: 3,
    realmId: checkedRealmId(req),
  });
  res.json({ message: 'All characters updated successfully.', result });
}

export async function getLatestGear(req: Request, res: Response) {
  const { characterId } = validated<CharacterIdParams>(req, 'params');
  res.json(await usecases.getCharacterGear(characterId));
}

export async function getKeyHistory(req: Request, res: Response) {
  const query = validated<{ realmId: number; weekStart?: Date; minLevel?: number }>(req, 'query');
  res.json(await usecases.getKeyHistory(query));
}

export async function getAllGear(req: Request, res: Response) {
  const { ids } = validated<{ ids: number[] }>(req, 'query');
  res.json(await usecases.getAllCharacterGear(ids));
}

export async function getBlizzardEquipment(req: Request, res: Response) {
  const { characterId } = validated<CharacterIdParams>(req, 'params');
  res.json(await usecases.getBlizzardEquipment(characterId));
}

export async function syncFromBlizzard(req: Request, res: Response) {
  const { characterId } = validated<CharacterIdParams>(req, 'params');
  res.json(await usecases.syncCharacterFromBlizzard(characterId, checkedRealmId(req)));
}

export async function checkMount(req: Request, res: Response) {
  const { characterId, mountId } = validated<CharacterIdParams & { mountId: number }>(
    req,
    'params',
  );
  res.json(await usecases.checkCharacterMount(characterId, mountId));
}
