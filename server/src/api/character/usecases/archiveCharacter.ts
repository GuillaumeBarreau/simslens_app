/**
 * Supprime un personnage du roster en déliant son realmId.
 */

import { findCharacterInRealm } from '../character.access';
import characterRepository from '../character.repository';

export interface ArchiveCharacterOutput {
  id: number;
  message: string;
}

/**
 * @param realmId royaume vérifié par checkPermission
 * @throws {CharacterNotFoundError} si le personnage n'est pas dans ce royaume
 */
export async function archiveCharacter(
  characterId: number,
  realmId: number,
): Promise<ArchiveCharacterOutput> {
  const existing = await findCharacterInRealm(characterId, realmId);

  await characterRepository.updateCharacterById(characterId, {
    realmId: null,
    archived: 1,
    archivedAt: new Date(),
  });

  return {
    id: characterId,
    message: `${existing.name} a été retiré du roster`,
  };
}
