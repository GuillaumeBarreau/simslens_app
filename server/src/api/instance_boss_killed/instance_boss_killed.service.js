const instanceBossRepository = require('./instance_boss_killed.repository');

/**
 * @param {number} instanceId - The instance ID
 * @returns {Promise<Array>} Array of boss objects with kill status
 * @throws {Error} If instanceId is missing or database query fails
 */
async function getInstanceBosses(instanceId) {
  if (!instanceId) {
    throw new Error('Instance ID is required');
  }

  const bosses = await instanceBossRepository.listInstanceBossStatuses(instanceId);
  return bosses;
}

/**
 * @param {number} instanceId - The instance ID
 * @param {number} bossId - The boss ID
 * @returns {Promise<Object>} The boss object with kill status
 * @throws {Error} If ids are missing, boss not found, or database query fails
 */
async function getBossStatus(instanceId, bossId) {
  if (!instanceId || !bossId) {
    throw new Error('Instance ID and boss ID are required');
  }

  const boss = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);
  if (!boss) {
    const error = new Error(`Boss ${bossId} not found for instance ${instanceId}`);
    error.status = 404;
    throw error;
  }
  return boss;
}

/**
 * @param {number} instanceId - The instance ID
 * @param {number} bossId - The boss ID
 * @returns {Promise<Object>} The updated boss object
 * @throws {Error} If ids are missing, boss already killed, or database query fails
 */
async function killBoss(instanceId, bossId) {
  if (!instanceId || !bossId) {
    throw new Error('Instance ID and boss ID are required');
  }

  let status = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);

  if (!status) {
    console.log(
      `Boss ${bossId} not found in instance_bosses for instance ${instanceId}, creating entry...`,
    );
    try {
      await instanceBossRepository.createInstanceBosses(instanceId, [bossId]);
      status = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);
      console.log('Created boss entry:', status);
    } catch (err) {
      throw new Error(`Failed to create boss ${bossId} for instance ${instanceId}: ${err.message}`);
    }
  }

  if (status.killed) {
    const error = new Error(`Boss ${status.boss_name} is already marked as killed`);
    error.status = 409;
    throw error;
  }

  await instanceBossRepository.setInstanceBossKilled(instanceId, bossId);
  const updatedStatus = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);

  return updatedStatus;
}

/**
 * @param {number} instanceId - The instance ID
 * @param {number} bossId - The boss ID
 * @returns {Promise<Object>} The updated boss object
 * @throws {Error} If ids are missing, boss not killed, or database query fails
 */
async function resurrectBoss(instanceId, bossId) {
  if (!instanceId || !bossId) {
    throw new Error('Instance ID and boss ID are required');
  }

  let status = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);

  if (!status) {
    console.log(
      `Boss ${bossId} not found in instance_bosses for instance ${instanceId}, creating entry...`,
    );
    try {
      await instanceBossRepository.createInstanceBosses(instanceId, [bossId]);
      status = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);
    } catch (err) {
      throw new Error(`Failed to create boss ${bossId} for instance ${instanceId}: ${err.message}`);
    }
  }

  if (!status.killed) {
    const error = new Error(`Boss ${status.boss_name} is not marked as killed`);
    error.status = 409;
    throw error;
  }

  await instanceBossRepository.setInstanceBossNotKilled(instanceId, bossId);
  const updatedStatus = await instanceBossRepository.findInstanceBossStatus(instanceId, bossId);

  return updatedStatus;
}

/**
 * @param {number} instanceId - The instance ID
 * @param {Array<number>} bossIds - Array of boss IDs to initialize
 * @returns {Promise<void>}
 * @throws {Error} If instanceId or bossIds are missing or database query fails
 */
async function initializeInstance(instanceId, bossIds) {
  if (!instanceId || !Array.isArray(bossIds) || bossIds.length === 0) {
    throw new Error('Instance ID and array of boss IDs are required');
  }

  await instanceBossRepository.createInstanceBosses(instanceId, bossIds);
}

module.exports = {
  getInstanceBosses,
  getBossStatus,
  killBoss,
  resurrectBoss,
  initializeInstance,
};
