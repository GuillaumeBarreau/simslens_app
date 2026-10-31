import { isWantedPriority } from '../../../shared/constants/wishlistPriority';
import {
  buildBossUpgrades,
  describeSpecialization,
  latestUpgradeByItem,
  listSimulatedSpecializations,
  pickSpecializationId,
  simMetricForSpecialization,
} from '../item_upgrade.bossUpgrades';
import upgradeRepository from '../item_upgrade.repository';
import type {
  CharacterBossUpgradesQuery,
  CharacterBossUpgradesResult,
} from '../item_upgrade.types';

/**
 * Vue par boss du butin d'un personnage, avec les gains simulés **d'une seule
 * spé** : celle demandée (`specializationId`), sinon la spé principale du
 * personnage, sinon la dernière simulée. Les sims des autres spés ne s'y
 * mélangent jamais.
 *
 * Renvoie aussi la spé retenue et la liste des spés qui ont des sims, pour
 * que l'interface propose d'en changer.
 */
export async function getCharacterBossUpgrades(
  query: CharacterBossUpgradesQuery,
): Promise<CharacterBossUpgradesResult> {
  const { character, characterClass, bosses, upgrades, wishlistEntries, tokenRewards } =
    await upgradeRepository.getCharacterBossUpgradesData(query);

  const specializations = listSimulatedSpecializations(upgrades, characterClass);
  const specializationId = pickSpecializationId({
    requested: query.specializationId,
    mainSpecializationId: character?.specializationId,
    simulated: specializations,
  });

  // Une seule grandeur par vue (SIMS-202) : des HPS (QE Live) ne côtoient
  // jamais des DPS dans les gains d'un même boss.
  const metric = simMetricForSpecialization(upgrades, specializationId, characterClass);
  const upgradeByItemId = latestUpgradeByItem(upgrades, specializationId, characterClass, metric);
  // « Je n'en veux pas » n'est pas un vœu (SIMS-205).
  const wishlistItemIds = new Set(
    wishlistEntries
      .filter((w) => isWantedPriority(w.priority))
      .map((w) => w.itemId)
      .filter((id): id is number => id != null),
  );

  return {
    specializationId,
    specialization:
      specializationId != null ? describeSpecialization(specializationId, characterClass) : null,
    specializations,
    metric,
    bosses: buildBossUpgrades({ bosses, upgradeByItemId, wishlistItemIds, tokenRewards, metric }),
  };
}
