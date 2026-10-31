const axios = require('axios');

const RAIDERIO_BASE = 'https://raider.io/api/v1';

/**
 * @returns {Promise<Array>} Liste des runs récents
 */
async function getCharacterRecentRuns(region = 'eu', realm, character) {
  const url = `${RAIDERIO_BASE}/characters/profile`;
  const params = {
    region,
    realm: realm.toLowerCase(),
    name: character.toLowerCase(),
    fields: 'mythic_plus_recent_runs',
  };
  const response = await axios.get(url, { params });
  return response.data?.mythic_plus_recent_runs || [];
}

/**
 * Utilise le champ mythic_plus_weekly_highest_level_runs (meilleur run par donjon cette semaine)
 * @returns {Promise<Array>} Liste des runs de la semaine
 */
async function getCharacterWeeklyRuns(region = 'eu', realm, character) {
  const url = `${RAIDERIO_BASE}/characters/profile`;
  const params = {
    region,
    realm: realm.toLowerCase(),
    name: character.toLowerCase(),
    fields: 'mythic_plus_weekly_highest_level_runs',
  };
  const response = await axios.get(url, { params });
  return response.data?.mythic_plus_weekly_highest_level_runs || [];
}

/**
 * Fetch both recent and weekly best-per-dungeon runs in a single API call.
 * Used to mitigate the 10-run cap on `mythic_plus_recent_runs`.
 * @returns {Promise<{recent: Array, weeklyBest: Array}>}
 */
async function getCharacterRunsBundle(region = 'eu', realm, character) {
  const url = `${RAIDERIO_BASE}/characters/profile`;
  const params = {
    region,
    realm: realm.toLowerCase(),
    name: character.toLowerCase(),
    fields: 'mythic_plus_recent_runs,mythic_plus_weekly_highest_level_runs',
  };
  const response = await axios.get(url, { params });
  return {
    recent: response.data?.mythic_plus_recent_runs || [],
    weeklyBest: response.data?.mythic_plus_weekly_highest_level_runs || [],
  };
}

/**
 * @param {Array} runs - Liste des runs Raider.IO
 * @param {number} periodStartMs - Timestamp de début de période en ms
 * @param {number} [minLevel=2] - Niveau minimum de keystone
 * @returns {number}
 */
function countRunsInPeriod(runs, periodStartMs, minLevel = 2) {
  return runs.filter((run) => {
    const completedAt = new Date(run.completed_at).getTime();
    return completedAt >= periodStartMs && run.mythic_level >= minLevel;
  }).length;
}

module.exports = {
  getCharacterRecentRuns,
  getCharacterWeeklyRuns,
  getCharacterRunsBundle,
  countRunsInPeriod,
};
