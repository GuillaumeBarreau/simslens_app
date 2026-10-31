/**
 * Crée une instance de raid et initialise ses boss. Quand l'appelant ne
 * fournit pas la liste, elle est déduite de la difficulté choisie.
 */

import raidDifficultyRepository from '../../raid_difficulty/raid_difficulty.repository';
import { instanceBossRepository } from '../instance.bossInitialisation';
import { RaidDifficultyRequiredError } from '../instance.errors';
import instanceRepository from '../instance.repository';
import type { CreateInstanceInput, InstanceEntity } from '../instance.types';

export async function createInstance(payload: CreateInstanceInput): Promise<InstanceEntity | null> {
  if (!payload?.raidDifficultyId) {
    throw new RaidDifficultyRequiredError();
  }

  console.log('Creating instance with payload:', payload);

  const id = await instanceRepository.createInstance(payload);
  console.log(`Created instance ${id}`);

  const bossIds = payload.bossIds?.length
    ? payload.bossIds
    : await findBossIdsForDifficulty(payload.raidDifficultyId);

  if (bossIds.length > 0) {
    console.log(`Initializing ${bossIds.length} bosses for instance ${id}`);
    await instanceBossRepository.createInstanceBosses(id, bossIds);
    await instanceRepository.updateInstanceById(id, { totalBosses: bossIds.length });
  }

  return instanceRepository.findInstanceById(id);
}

/**
 * Boss du raid associé à une difficulté.
 *
 * Un échec de lecture n'interrompt pas la création : l'instance existe, ses
 * boss pourront être initialisés ensuite.
 */
async function findBossIdsForDifficulty(raidDifficultyId: number): Promise<number[]> {
  try {
    console.log(`Fetching bosses for raidDifficultyId: ${raidDifficultyId}`);
    const raidDifficulty = await raidDifficultyRepository.findRaidDifficultyById(raidDifficultyId);
    if (!raidDifficulty) return [];

    const bosses = await raidDifficultyRepository.listBossesForRaid(raidDifficulty.raidId);
    const bossIds = bosses.map((b: { id: number }) => b.id);
    console.log(`Found ${bossIds.length} bosses for raid:`, bossIds);

    return bossIds;
  } catch (err) {
    console.warn('Could not fetch bosses for raid difficulty:', (err as Error).message);
    return [];
  }
}
