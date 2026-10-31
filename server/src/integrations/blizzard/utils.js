function getReputationLevel(reputationManaforgeRenownLevel) {
  const ranges = [
    { min: 4, max: 6, value: 3 },
    { min: 7, max: 9, value: 6 },
    { min: 10, max: 12, value: 9 },
    { min: 13, max: 14, value: 12 },
    { min: 15, max: 15, value: 15 },
  ];

  const range = ranges.find(
    ({ min, max }) =>
      reputationManaforgeRenownLevel >= min && reputationManaforgeRenownLevel <= max,
  );

  return range ? range.value : null;
}

function getCurrentPeriodKeyCount(data) {
  if (!data || !data.current_period || !data.current_period.best_runs) {
    return 0;
  }
  return data.current_period.best_runs.filter((run) => run.keystone_level >= 10).length;
}

/**
 * @param {string} avatarUrl - URL complète de l'avatar (ex: https://render-eu.worldofwarcraft.com/character/164/180190372-avatar.jpg)
 * @returns {string|null} - Chemin relatif du thumbnail (ex: 164/180190372-avatar.jpg) ou null
 */
function extractThumbnailPath(avatarUrl) {
  if (!avatarUrl) return null;
  try {
    const match = avatarUrl.match(/\/character\/([^?]+)/);
    if (match?.[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    console.warn('Error extracting thumbnail path from URL:', avatarUrl, error);
    return null;
  }
}

module.exports = {
  getReputationLevel,
  getCurrentPeriodKeyCount,
  extractThumbnailPath,
};
