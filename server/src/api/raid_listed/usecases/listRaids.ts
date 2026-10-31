import { ValidationError } from '../../../shared/errors/AppError';
import type { SeasonScope } from '../raid_listed.constants';
import { applyLegacyRaidDefaults } from '../raid_listed.constants';
import raidRepository from '../raid_listed.repository';

export async function listRaidDifficultyPairs(
  extension?: string,
  season?: string,
): Promise<unknown[]> {
  return raidRepository.listAllRaidDifficultyPairs(extension, season);
}

/**
 * Boss d'un raid, désigné par son extension et sa saison. Le raid historique
 * (LEGACY_RAID_ID) les reçoit par défaut quand ils manquent.
 *
 * @throws {ValidationError} sans extension ou saison après ce repli
 */
export async function getBossesByRaid(
  raidId: number | undefined,
  scope: SeasonScope,
): Promise<unknown[]> {
  const { extension, season } = applyLegacyRaidDefaults(raidId, scope);
  if (!extension || !season) {
    throw new ValidationError('Missing extension or season parameters');
  }

  return raidRepository.getBossesByRaid(extension, season);
}
