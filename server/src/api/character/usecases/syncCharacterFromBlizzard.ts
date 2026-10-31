/**
 * Met à jour le dernier relevé d'équipement du personnage (niveaux d'objet,
 * paliers d'amélioration) depuis l'API Blizzard, et remplit sa spé si elle est
 * vide (SIMS-208).
 */

import { prisma } from '../../../data';
import { getCharacterProfile } from '../../../integrations/blizzard/api';
import { syncUpgradesFromBlizzard } from '../../../services/blizzardSync.service';
import { fillSpecializationFromBlizzard, isSpecializationEmpty } from '../blizzardSpecialization';
import { findCharacterInRealm } from '../character.access';

/**
 * Spé active lue sur le profil Blizzard (locale en_GB : nom anglais), posée
 * seulement si celle du personnage est vide. Un échec est journalisé sans
 * faire échouer la synchronisation.
 */
async function fillEmptySpecialization(character: {
  id: number;
  name: string;
  realm: string;
  region?: string | null;
  class?: string | null;
  spec?: string | null;
  specializationId?: number | null;
}): Promise<void> {
  if (!isSpecializationEmpty(character)) return;
  try {
    const profile = await getCharacterProfile(
      character.region || 'eu',
      character.realm,
      character.name,
    );
    await fillSpecializationFromBlizzard(character.id, character.class, profile?.active_spec?.name);
  } catch (err) {
    console.warn(
      `[Blizzard spec] Profil de ${character.name} (${character.realm}) illisible :`,
      (err as Error).message,
    );
  }
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @throws {CharacterNotFoundError} si le personnage n'est pas dans ce royaume
 */
export async function syncCharacterFromBlizzard(characterId: number, realmId: number) {
  const character = await findCharacterInRealm(characterId, realmId);

  await fillEmptySpecialization(character);
  const result = await syncUpgradesFromBlizzard(prisma, characterId);

  return {
    message: `Synchronisation réussie pour ${character.name}`,
    character: {
      id: character.id,
      name: character.name,
      realm: character.realm,
      region: character.region,
    },
    result,
  };
}
