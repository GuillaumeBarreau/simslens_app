/**
 * Lie à l'utilisateur un personnage de son compte Battle.net : rattache un
 * personnage connu, ou le crée, dans la guilde enregistrée qui correspond.
 */

import { getCharacterEnrichedData } from '../../../integrations/blizzard/api';
import { fillSpecializationFromBlizzard } from '../../character/blizzardSpecialization';
import characterRepo from '../../character/character.repository';
import inviteRepo from '../../invite/invite.repository';
import realmRepo from '../../realm/realm.repository';
import { CharacterNotOwnedError, CharacterWithoutRealmError } from '../blizzard.errors';
import blizzardService from '../blizzard.service';
import type {
  BnetCharacter,
  BnetSession,
  ClaimCharacterInput,
  ClaimCharacterResult,
} from '../blizzard.types';

const ADMIN_ROLES = new Set(['admin', 'owner']);

const toClassName = (bnetChar: BnetCharacter) =>
  bnetChar.playable_class.name.toLowerCase().replace(/\s+/g, '_');

/** Guilde du personnage : celle de la liste, sinon celle de son profil complet. */
async function findGuildName(
  token: string,
  bnetChar: BnetCharacter,
  region: string,
): Promise<string | null> {
  if (bnetChar.guild?.name) return bnetChar.guild.name;
  const profile = await blizzardService.getCharacterProfile(
    token,
    bnetChar.realm.slug,
    bnetChar.name,
    region,
  );
  return profile?.guild?.name ?? null;
}

async function findGuildRealmId(
  token: string,
  bnetChar: BnetCharacter,
  region: string,
): Promise<number | null> {
  const guildName = await findGuildName(token, bnetChar, region);
  if (!guildName) return null;
  const realm = await realmRepo.findRealmByNameAndRegion(guildName, region);
  return realm?.id ?? null;
}

async function isRealmAdmin(realmId: number, userId: string): Promise<boolean> {
  const role = await realmRepo.getRealmUserRole(realmId, userId);
  return role !== null && ADMIN_ROLES.has(role);
}

/** Premier royaume où l'utilisateur est invité, à défaut de guilde. */
async function findGuestRealmId(userId: string): Promise<number | null> {
  const memberships = await inviteRepo.getGuestMembershipsByUserId(userId);
  return memberships[0]?.realmId ?? null;
}

/**
 * Met à jour ilvl, clés, score et vignette depuis l'API Blizzard, et la spé
 * active si celle du personnage est vide (SIMS-208 : une spé choisie à la main
 * n'est jamais écrasée). Un échec est journalisé sans faire échouer la liaison.
 */
async function updateCharacterFromBlizzard(
  characterId: number,
  className: string,
  name: string,
  realm: string,
  region: string,
): Promise<void> {
  try {
    let details;
    try {
      details = await getCharacterEnrichedData(region, realm, name);
    } catch (apiErr) {
      if ((apiErr as { response?: { status?: number } })?.response?.status === 404) {
        console.warn(`Blizzard API returned 404 for ${name} (${realm})`);
        return;
      }
      throw apiErr;
    }

    const fields: Record<string, unknown> = {
      lastModified: new Date(),
      currentPeriodKeyCount: details.currentPeriodKeyCount || 0,
      ilvl: details.ilvl || 0,
      score: details.score || 0,
      ManaforgeBuff: String(details.ManaforgeBuff || 0),
    };
    if (typeof details.thumbnail === 'string' && details.thumbnail.trim() !== '') {
      fields.thumbnail = details.thumbnail;
    }

    await characterRepo.updateCharacterById(characterId, fields);
    await fillSpecializationFromBlizzard(characterId, className, details.active_spec);
  } catch (err) {
    console.error(`Error updating character ${characterId} from Blizzard:`, (err as Error).message);
  }
}

export async function claimCharacter(
  session: BnetSession,
  input: ClaimCharacterInput,
): Promise<ClaimCharacterResult> {
  const { token, userId } = session;
  const { name, realm } = input;
  const region = (input.region || 'EU').toUpperCase();

  const bnetChars: BnetCharacter[] = await blizzardService.listUserCharacters(
    token,
    input.region || 'eu',
    false,
  );
  const bnetChar = bnetChars.find(
    (c) =>
      c.name.toLowerCase() === name.toLowerCase() &&
      c.realm.slug.toLowerCase() === realm.toLowerCase(),
  );
  if (!bnetChar) throw new CharacterNotOwnedError();

  const existingChar: { id: number; realmId: number | null } | null =
    await characterRepo.findCharacterIdByNameAndRealm(name, realm);

  if (!existingChar) {
    const realmId =
      (await findGuildRealmId(token, bnetChar, region)) ?? (await findGuestRealmId(userId));
    if (!realmId) throw new CharacterWithoutRealmError();

    const className = toClassName(bnetChar);
    // Sans spé (null) : posée juste après d'après la spé active Blizzard, sinon
    // par la prochaine synchronisation. Jamais de 'dps' par défaut (SIMS-208).
    const characterId = await characterRepo.createCharacter({
      name: bnetChar.name,
      realm: bnetChar.realm.slug,
      class: className,
      region,
      realmId,
      userId,
      ilvl: bnetChar.average_item_level || 0,
      status: (await isRealmAdmin(realmId, userId)) ? 'approved' : 'pending',
      lastModified: new Date(),
    });

    await updateCharacterFromBlizzard(
      characterId,
      className,
      bnetChar.name,
      bnetChar.realm.slug,
      region,
    );
    return { success: true, created: true, realmId, characterId };
  }

  // Personnage déjà connu : rattaché à l'utilisateur et à sa guilde.
  let realmId = await findGuildRealmId(token, bnetChar, region);
  let status = realmId && (await isRealmAdmin(realmId, userId)) ? 'approved' : 'pending';

  if (!realmId && !existingChar.realmId) {
    const guestRealmId = await findGuestRealmId(userId);
    if (guestRealmId) {
      realmId = guestRealmId;
      status = 'approved';
    }
  }

  const className = toClassName(bnetChar);
  await characterRepo.updateCharacterById(existingChar.id, {
    userId,
    realmId: realmId || existingChar.realmId,
    status,
    class: className,
    lastModified: new Date(),
  });

  await updateCharacterFromBlizzard(existingChar.id, className, name, realm, region);
  return { success: true, updated: true, characterId: existingChar.id };
}
