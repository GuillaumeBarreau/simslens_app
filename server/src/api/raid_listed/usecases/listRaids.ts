import { ValidationError } from '../../../shared/errors/AppError';
import { gameFromExtension } from '../../../shared/game/games';
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
 * Une saison Retail n'a qu'un raid ; un palier Forever en a plusieurs (10, 20 et
 * 40 joueurs) : les boss y sont aussi filtrés par raid (SIMS-057).
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

  if (raidId !== undefined && gameFromExtension(extension) === 'forever') {
    const raidName = await raidRepository.findRaidName(raidId);
    return raidName ? raidRepository.getBossesByRaid(extension, season, raidName) : [];
  }

  return raidRepository.getBossesByRaid(extension, season);
}
