import { CharacterNotFoundError } from '../character.errors';
import characterRepository from '../character.repository';
import type { ListCharactersFilters } from '../character.types';

export async function listCharacters(realmId?: number) {
  return characterRepository.listCharacters(realmId);
}

export async function listRosterStatus(filters: ListCharactersFilters = {}) {
  return characterRepository.listCharactersRosterStatus({
    includePending: filters.includePending ?? true,
    realmId: filters.realmId,
  });
}

export async function listPendingRoster(filters: ListCharactersFilters = {}) {
  const characters = await characterRepository.listCharactersRosterStatus({
    includePending: true,
    realmId: filters.realmId,
  });

  return characters.filter((c) => c.status === 'pending');
}

export async function getCharacterByName(name: string) {
  return characterRepository.findCharacterByName(name);
}

/**
 * Personnage actif portant ce tag Discord (inscription par le bot).
 */
export async function getCharacterByDiscordTag(tag: string) {
  const character = await characterRepository.findCharacterByDiscordTag(tag);
  if (!character) throw new CharacterNotFoundError(tag);
  return character;
}
