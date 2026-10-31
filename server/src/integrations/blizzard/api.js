const { fetchFromAPI, regionHost } = require('./blizzardToken.js');
const {
  getReputationLevel,
  getCurrentPeriodKeyCount,
  extractThumbnailPath,
} = require('./utils.js');
const { getCharacterWeeklyRuns } = require('../raiderio/api.js');

async function getCharacterProfile(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

async function getCharacterMythicKeystoneProfile(
  region = 'eu',
  realm,
  character,
  locale = 'en_GB',
) {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/mythic-keystone-profile`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

async function countCurrentPeriodHighKeysRuns(region = 'eu', realm, character, locale = 'en_GB') {
  const data = await getCharacterMythicKeystoneProfile(region, realm, character, locale);
  return getCurrentPeriodKeyCount(data);
}

/**
 * @param {string} region - Région du personnage (eu, us, etc.)
 * @param {string} realm - Royaume du personnage
 * @param {string} character - Nom du personnage
 * @param {string} locale - Locale (fr_FR, en_GB, etc.)
 * @returns {Promise<{currentPeriodKeyCount: number, ilvl: number, score: number, ManaforgeBuff: number, thumbnail: string|null, active_spec: string|undefined, class: string|undefined}>}
 *   `active_spec` et `class` sont des noms dans la locale demandée : anglais avec en_GB, la valeur par défaut.
 */
async function getCharacterEnrichedData(region = 'eu', realm, character, locale = 'en_GB') {
  const keystoneProfile = await getCharacterMythicKeystoneProfile(region, realm, character, locale);

  let currentPeriodKeyCount = getCurrentPeriodKeyCount(keystoneProfile);
  try {
    const weeklyRuns = await getCharacterWeeklyRuns(region, realm, character);
    currentPeriodKeyCount = weeklyRuns.filter((r) => r.mythic_level >= 10).length;
  } catch (rioErr) {
    console.warn(
      `[KeyCount RaiderIO] Failed for ${character} (${realm}), fallback to Blizzard:`,
      rioErr.message,
    );
  }

  const characterProfile = await getCharacterProfile(region, realm, character, locale);
  const { reputations } = await getCharacterReputations(region, realm, character, locale);

  const reputationManaforgeRenownLevel = reputations.find((rep) => rep.faction.id === 2736)
    ?.standing.renown_level;
  const ManaforgeBuff = getReputationLevel(reputationManaforgeRenownLevel);

  let thumbnail = null;
  try {
    const characterMedia = await getCharacterMedia(region, realm, character, locale);
    if (characterMedia?.assets && Array.isArray(characterMedia.assets)) {
      const avatarAsset = characterMedia.assets.find((asset) => asset.key === 'avatar');
      if (avatarAsset?.value) {
        thumbnail = extractThumbnailPath(avatarAsset.value);
      }
    }
  } catch (mediaErr) {
    console.warn(`Failed to fetch character media for ${character} (${realm}):`, mediaErr.message);
  }

  return {
    currentPeriodKeyCount,
    ilvl: characterProfile.equipped_item_level,
    score: keystoneProfile.current_mythic_rating?.rating || 0,
    ManaforgeBuff: ManaforgeBuff,
    thumbnail: thumbnail,
    active_spec: characterProfile.active_spec?.name,
    class: characterProfile.character_class?.name,
  };
}

async function getCharacterReputations(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/reputations`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

async function getCharacterMedia(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/character-media`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

/**
 * @param {string} region - Région du personnage (eu, us, etc.)
 * @param {string} realm - Royaume du personnage
 * @param {string} character - Nom du personnage
 * @param {string} locale - Locale (fr_FR, en_GB, etc.)
 * @returns {Promise<Object>} Données d'équipement du personnage
 */
async function getCharacterEquipment(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/equipment`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

/**
 * @param {string} region - Région du personnage (eu, us, etc.)
 * @param {string} realm - Royaume du personnage
 * @param {string} character - Nom du personnage
 * @param {string} locale - Locale (fr_FR, en_GB, etc.)
 * @returns {Promise<Object>} Collection de montures du personnage
 */
async function getCharacterMountsCollection(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/collections/mounts`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

/**
 * Récupère les spécialisations d'un personnage (loadouts de talents inclus).
 * Chaque loadout contient talent_loadout_code + selected_{class,spec,hero}_talents.
 */
async function getCharacterSpecializations(region = 'eu', realm, character, locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/profile/wow/character/${realm.toLowerCase()}/${character.toLowerCase()}/specializations`;
  return fetchFromAPI(url, { namespace: `profile-${normRegion}`, locale }, normRegion);
}

/**
 * @returns {Promise<{spec_talent_trees: Array, class_talent_trees: Array}>}
 */
async function getTalentTreeIndex(region = 'eu', locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/data/wow/talent-tree/index`;
  return fetchFromAPI(url, { namespace: `static-${normRegion}`, locale }, normRegion);
}

/**
 * Arbre de talents complet d'une spécialisation (nœuds classe + spé + héros, avec positions).
 * @param {number} talentTreeId - talentTreeId Blizzard (arbre de classe)
 * @param {number} specId - playable specialization id
 */
async function getTalentTreeForSpec(talentTreeId, specId, region = 'eu', locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/data/wow/talent-tree/${talentTreeId}/playable-specialization/${specId}`;
  return fetchFromAPI(url, { namespace: `static-${normRegion}`, locale }, normRegion);
}

async function getPlayableSpecializationIndex(region = 'eu', locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/data/wow/playable-specialization/index`;
  return fetchFromAPI(url, { namespace: `static-${normRegion}`, locale }, normRegion);
}

/**
 * Détail d'une spécialisation jouable (classe + href de l'arbre de talents associé).
 * @param {number} specId - playable specialization id
 */
async function getPlayableSpecialization(specId, region = 'eu', locale = 'en_GB') {
  const host = regionHost(region);
  const normRegion = (region || 'eu').toLowerCase();
  const url = `https://${host}/data/wow/playable-specialization/${specId}`;
  return fetchFromAPI(url, { namespace: `static-${normRegion}`, locale }, normRegion);
}

module.exports = {
  getCharacterProfile,
  getCharacterMythicKeystoneProfile,
  countCurrentPeriodHighKeysRuns,
  getCharacterEnrichedData,
  getCharacterReputations,
  getCharacterMedia,
  getCharacterEquipment,
  getCharacterMountsCollection,
  getCharacterSpecializations,
  getTalentTreeIndex,
  getTalentTreeForSpec,
  getPlayableSpecializationIndex,
  getPlayableSpecialization,
};
