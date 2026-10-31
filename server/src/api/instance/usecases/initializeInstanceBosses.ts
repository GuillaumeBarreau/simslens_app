/**
 * Réparation manuelle d'une instance dont les boss n'ont pas été créés.
 * La difficulté peut être imposée, sinon elle est lue sur l'instance.
 */

import raidDifficultyRepository from '../../raid_difficulty/raid_difficulty.repository';
import { assertInstanceInRealm } from '../instance.access';
import { instanceBossRepository } from '../instance.bossInitialisation';
import { InstanceError, InstanceIdRequiredError } from '../instance.errors';
import instanceRepository from '../instance.repository';
import type { InstanceEntity } from '../instance.types';

/**
 * @throws {InstanceNotFoundError} si l'instance n'existe pas ou sort du royaume
 */
export async function initializeInstanceBosses(
  instanceId: number,
  realmId: number,
  raidDifficultyId?: number | null,
): Promise<InstanceEntity | null> {
  if (!instanceId) {
    throw new InstanceIdRequiredError();
  }
  await assertInstanceInRealm(instanceId, realmId);

  console.log(`Initializing bosses for instance ${instanceId}`);

  const difficultyId = raidDifficultyId ?? (await readDifficultyOfInstance(instanceId));
  if (!difficultyId) {
    throw new InstanceError(
      `Cannot determine raid difficulty for instance ${instanceId}`,
      400,
      'missing_raid_difficulty',
    );
  }

  const raidDifficulty = await raidDifficultyRepository.findRaidDifficultyById(difficultyId);
  if (!raidDifficulty) {
    throw new InstanceError(`Raid difficulty ${difficultyId} not found`, 404, 'not_found');
  }

  const bosses = await raidDifficultyRepository.listBossesForRaid(raidDifficulty.raidId);
  if (!bosses || bosses.length === 0) {
    throw new InstanceError(`No bosses found for raid ${raidDifficulty.raidId}`, 404, 'not_found');
  }

  const bossIds = bosses.map((b: { id: number }) => b.id);
  console.log(`Initializing ${bossIds.length} bosses for instance ${instanceId}`);

  await instanceBossRepository.createInstanceBosses(instanceId, bossIds);
  await instanceRepository.updateInstanceById(instanceId, { totalBosses: bossIds.length });

  return instanceRepository.findInstanceById(instanceId);
}

async function readDifficultyOfInstance(instanceId: number): Promise<number | null> {
  const instance = await instanceRepository.findInstanceById(instanceId);
  if (!instance) {
    throw new InstanceError(`Instance ${instanceId} not found`, 404, 'not_found');
  }

  return instance.raidDifficultyId;
}
