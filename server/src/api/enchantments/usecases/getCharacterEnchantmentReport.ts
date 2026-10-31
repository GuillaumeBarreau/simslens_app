import { NoGearSnapshotError } from '../enchantments.errors';
import type { EnchantResult, GemResults } from '../enchantments.types';
import { verifyCharacterEnchantments, verifyCharacterGems } from './verifyCharacterEnchantments';

export interface CharacterEnchantmentReport {
  characterId: number;
  results: EnchantResult[];
  gems: GemResults['slots'];
  hasEpicGem: boolean;
}

/**
 * @throws {NoGearSnapshotError} si le personnage n'a aucun instantané
 */
export async function getCharacterEnchantmentReport(
  characterId: number,
): Promise<CharacterEnchantmentReport> {
  const [results, gems] = await Promise.all([
    verifyCharacterEnchantments(characterId),
    verifyCharacterGems(characterId),
  ]);

  if (results === null) throw new NoGearSnapshotError();

  return {
    characterId,
    results,
    gems: gems?.slots ?? [],
    hasEpicGem: gems?.hasEpicGem ?? false,
  };
}
