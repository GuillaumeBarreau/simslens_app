/**
 * Returns the latest gear snapshot for a list of character IDs in a single DB query.
 */

import characterRepository from '../character.repository';

export async function getAllCharacterGear(characterIds: number[]) {
  const snapshots = await characterRepository.getAllLatestGearSnapshots(characterIds);
  return { snapshots };
}
