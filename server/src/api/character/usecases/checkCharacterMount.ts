import { getCharacterMountsCollection } from '../../../integrations/blizzard/api';
import { CharacterNotFoundError } from '../character.errors';
import characterRepository from '../character.repository';

/** Collection de montures renvoyée par l'API Blizzard (champs utilisés). */
export interface MountsCollection {
  mounts?: Array<{ mount: { id: number } }>;
}

export function hasMount(
  collection: MountsCollection | null | undefined,
  mountId: number,
): boolean {
  return (collection?.mounts ?? []).some((m) => m.mount.id === mountId);
}

export async function checkCharacterMount(characterId: number, mountId: number) {
  const character = await characterRepository.findCharacterById(characterId);
  if (!character) throw new CharacterNotFoundError(characterId);

  const collection: MountsCollection | null = await getCharacterMountsCollection(
    character.region || 'eu',
    character.realm,
    character.name,
  );
  return { hasMount: hasMount(collection, mountId) };
}
