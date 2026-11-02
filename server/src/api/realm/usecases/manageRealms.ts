import createError from 'http-errors';

import blizzardService from '../../blizzard/blizzard.service';
import inviteRepo from '../../invite/invite.repository';
import regionRepo from '../../region/region.repository';
import { assertRealmExists } from '../realm.access';
import { CharacterNotAttachableError } from '../realm.errors';
import realmRepo from '../realm.repository';
import type { CreateRealmInput, CreateRealmResult, RealmEntity } from '../realm.types';

/**
 * Crée un royaume après avoir vérifié auprès de Blizzard que la guilde
 * existe et que le demandeur en fait partie.
 *
 * Le jeu du royaume est celui du serveur choisi (SIMS-019). WoW Forever n'a pas
 * encore d'API Blizzard : pour un serveur Forever, ces deux contrôles sont
 * sautés et l'unicité région + serveur + nom reste la seule garantie.
 */
export async function createRealm({
  name,
  server,
  region,
  ownerId,
  userToken,
}: CreateRealmInput): Promise<CreateRealmResult> {
  if (!name || !server || !region) {
    throw createError(400, 'Missing required fields: name, server, region');
  }

  if (!userToken) {
    throw createError(401, 'Battle.net authentication required');
  }

  const game = (await regionRepo.findServerBySlug(server, region))?.game ?? 'retail';

  if (game === 'retail') {
    await assertGuildExists(userToken, server, name, region);
    await assertUserBelongsToGuild(userToken, server, name, region);
  }

  const existing = await realmRepo.findRealmByDetails(name, server, region);
  if (existing) {
    throw createError(409, 'Realm already exists');
  }

  const id = await realmRepo.createRealm({ name, server, region, ownerId, game });

  return { id, name, server, region, game };
}

async function assertGuildExists(
  userToken: string,
  server: string,
  name: string,
  region: string,
): Promise<void> {
  try {
    await blizzardService.validateGuildExists(userToken, server, name, region);
  } catch (error) {
    if ((error as Error).message === 'Guild not found on the specified server') {
      throw createError(404, (error as Error).message);
    }
    console.error('Error validating guild existence:', error);
    throw createError(500, 'Failed to validate guild with Blizzard API');
  }
}

async function assertUserBelongsToGuild(
  userToken: string,
  server: string,
  name: string,
  region: string,
): Promise<void> {
  try {
    const userInGuild = await blizzardService.validateUserInGuild(userToken, server, name, region);
    if (!userInGuild) {
      throw createError(
        403,
        'You must have at least one character in this guild to create a realm',
      );
    }
  } catch (error) {
    if ((error as { status?: number }).status === 403) {
      throw error;
    }
    console.error('Error validating user membership:', error);
    throw createError(500, 'Failed to validate guild membership');
  }
}

export async function listRealms(): Promise<RealmEntity[]> {
  return realmRepo.listAllRealms();
}

export async function getRealm(id: number): Promise<RealmEntity & { characters: unknown[] }> {
  const realm = await assertRealmExists(id);
  const characters = await realmRepo.getRealmCharacters(id);

  return { ...realm, characters };
}

/**
 * Rattache au royaume un personnage qui n'appartient encore à aucun.
 *
 * Dette technique n°20 (SIMS-182) : l'ancien garde portait sur une colonne
 * `realms.ownerId` inexistante et ne rejetait personne. La route exige
 * désormais `checkPermission(EDIT_ROSTER)` sur le royaume, et le repository
 * refuse un personnage déjà rattaché à un autre royaume : sans cela, un
 * responsable aurait fait passer dans sa guilde le personnage d'une autre,
 * et obtenu la main dessus.
 *
 * @throws {CharacterNotAttachableError} personnage absent ou d'un autre royaume
 */
export async function addCharacter(
  realmId: number,
  characterId: number,
): Promise<{ success: true }> {
  await assertRealmExists(realmId);

  const attached = await realmRepo.addCharacterToRealm(characterId, realmId);
  if (attached === 0) throw new CharacterNotAttachableError();

  return { success: true };
}

/**
 * Royaume auquel un membre est rattaché, cherché dans cet ordre :
 * en tant que propriétaire, puis comme membre, puis comme invité.
 *
 * Renvoie `{ realm: null }` plutôt qu'un 401 pour un visiteur non connecté :
 * l'appel sert à savoir s'il faut proposer la création d'un royaume.
 */
export async function checkUserRealm(ownerId?: string): Promise<RealmEntity | { realm: null }> {
  if (!ownerId) return { realm: null };

  const realm =
    (await realmRepo.findRealmByOwnerId(ownerId)) ??
    (await realmRepo.findRealmByMemberUserId(ownerId)) ??
    (await findRealmFromGuestMemberships(ownerId));

  if (!realm) throw createError(404, 'Realm not found for this user');

  return realm;
}

async function findRealmFromGuestMemberships(ownerId: string): Promise<RealmEntity | null> {
  await warnAboutUnlinkedCharacters(ownerId);

  const memberships = await inviteRepo.getGuestMembershipsByUserId(ownerId);

  return memberships.length > 0
    ? ((memberships[0] as unknown as { realm: RealmEntity }).realm ?? null)
    : null;
}

/**
 * Trace de diagnostic : distingue un compte dont aucun personnage n'est
 * revendiqué d'un compte dont les personnages ne sont rattachés à aucun
 * royaume.
 */
async function warnAboutUnlinkedCharacters(ownerId: string): Promise<void> {
  const hasChars = await realmRepo.hasCharacterWithUserId(ownerId);
  if (!hasChars) {
    console.warn(
      `[Realm] User ${ownerId} has no characters with userId set → characters not claimed`,
    );
  } else {
    console.warn(`[Realm] User ${ownerId} has characters but none linked to a realm`);
  }
}
