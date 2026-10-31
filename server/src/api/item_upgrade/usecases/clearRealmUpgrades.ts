import upgradeRepository from '../item_upgrade.repository';

/**
 * Efface les upgrades (résultats de sims) des personnages d'un royaume, et
 * seulement de ce royaume. Les autres guildes ne sont jamais touchées.
 */
export async function clearRealmUpgrades(realmId: number): Promise<{ deleted: number }> {
  const deleted = await upgradeRepository.deleteUpgradesByRealm(realmId);
  return { deleted };
}
