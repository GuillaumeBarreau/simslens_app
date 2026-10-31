/**
 * Équipement actuel du personnage, lu en direct sur l'API Blizzard.
 */

import { getCharacterEquipment } from '../../../integrations/blizzard/api';
import { CharacterNotFoundError } from '../character.errors';
import characterRepository from '../character.repository';

export async function getBlizzardEquipment(characterId: number) {
  const character = await characterRepository.findCharacterById(characterId);
  if (!character) throw new CharacterNotFoundError(characterId);

  const equipment = await getCharacterEquipment(
    character.region || 'eu',
    character.realm,
    character.name,
  );
  return { equipment };
}
