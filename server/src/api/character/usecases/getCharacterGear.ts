import characterRepository from '../character.repository';

export async function getCharacterGear(characterId: number) {
  const snapshot = await characterRepository.getLatestGearSnapshot(characterId);
  return { snapshot };
}
