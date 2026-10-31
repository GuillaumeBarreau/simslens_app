const instanceBossesRepository = require('../instance_boss_killed/instance_boss_killed.repository');

/**
 * @param {number} instanceId - The instance ID
 * @returns {Promise<Array>} Array of boss objects with kill status
 * @throws {Error} If instanceId is missing or database query fails
 */
async function listByInstance(instanceId) {
  if (!instanceId) {
    throw new Error('Instance ID is required');
  }
  const bosses = await instanceBossesRepository.listInstanceBossStatuses(instanceId);
  return bosses;
}

/**
 * @param {number} id - The instance boss ID
 * @param {boolean} killed - Whether the boss is killed
 * @returns {Promise<Object>} The updated boss object
 * @throws {Error} If id is missing or database query fails
 */
async function setKillState(id, killed) {
  if (!id) {
    throw new Error('Instance boss ID is required');
  }
  const killedAt = killed ? new Date().toISOString() : null;
  const result = await instanceBossesRepository.updateKillState(id, killed ? 1 : 0, killedAt);
  return result;
}

module.exports = {
  listByInstance,
  setKillState,
};
