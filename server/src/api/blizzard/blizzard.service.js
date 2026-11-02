const axios = require('axios');
const { blizzardNamespace } = require('../../shared/game/blizzardNamespace');

/**
 * @param {string} token - Battle.net Access Token
 * @param {string} region - Region (us, eu, kr, tw)
 * @param {boolean} enrich - Whether to fetch detailed profile (guild, ilvl) for each char. Default true.
 * @returns {Promise<Array>}
 */
async function listUserCharacters(token, region = 'eu', enrich = true) {
  const host = region === 'cn' ? 'gateway.battlenet.com.cn' : `${region}.api.blizzard.com`;
  const url = `https://${host}/profile/user/wow`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        namespace: blizzardNamespace('profile', region),
        locale: 'en_GB',
      },
    });

    const characters = [];
    if (response.data?.wow_accounts) {
      for (const account of response.data.wow_accounts) {
        if (account.characters) {
          const charsWithRegion = account.characters.map((char) => ({
            ...char,
            realm: {
              ...char.realm,
              region: region.toUpperCase(),
            },
          }));
          characters.push(...charsWithRegion);
        }
      }
    }

    if (enrich && characters.length > 0) {
      const enriched = [];
      const batchSize = 6;

      for (let i = 0; i < characters.length; i += batchSize) {
        const batch = characters.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (char) => {
            const profile = await getCharacterProfile(token, char.realm.slug, char.name, region);
            if (profile) {
              return {
                ...char,
                guild: profile.guild || null,
                average_item_level: profile.average_item_level,
                equipped_item_level: profile.equipped_item_level,
              };
            }
            return char;
          }),
        );
        enriched.push(...batchResults);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return enriched;
    }

    return characters;
  } catch (error) {
    console.error('Error fetching Blizzard characters:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * @param {string} token - User's Battle.net Access Token
 * @param {string} realmSlug - Realm Slug
 * @param {string} guildName - Guild Name (slugified preferably)
 * @param {string} region - Region
 * @returns {Promise<Array>} List of guild members
 */
async function getGuildRoster(token, realmSlug, guildName, region = 'eu') {
  const host = region === 'cn' ? 'gateway.battlenet.com.cn' : `${region}.api.blizzard.com`;
  const guildSlug = guildName.trim().toLowerCase().replace(/\s+/g, '-');
  const realm = realmSlug.trim().toLowerCase().replace(/\s+/g, '-');

  const url = `https://${host}/data/wow/guild/${realm}/${guildSlug}/roster`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        namespace: blizzardNamespace('profile', region),
        locale: 'en_GB',
      },
    });

    if (response.data && response.data.members) {
      return response.data.members.map((m) => ({
        name: m.character.name,
        rank: m.rank,
        level: m.character.level,
        classId: m.character.playable_class.id,
        realm: m.character.realm.slug,
      }));
    }
    return [];
  } catch (error) {
    console.error(
      `Error fetching guild roster for ${guildName}-${realmSlug}:`,
      error?.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * @param {string} token - User's Battle.net Access Token
 * @param {string} realmSlug - Realm Slug
 * @param {string} guildName - Guild Name
 * @param {string} region - Region
 * @returns {Promise<Array>} Guild roster if exists
 * @throws {Error} 404 if guild not found, or other API errors
 */
async function validateGuildExists(token, realmSlug, guildName, region = 'eu') {
  try {
    const roster = await getGuildRoster(token, realmSlug, guildName, region);
    return roster;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Guild not found on the specified server');
    }
    throw error;
  }
}

/**
 * @param {string} token - User's Battle.net Access Token
 * @param {string} realmSlug - Realm Slug
 * @param {string} guildName - Guild Name
 * @param {string} region - Region
 * @returns {Promise<boolean>} True if user has a character in guild
 * @throws {Error} If guild not found or API errors
 */
async function validateUserInGuild(token, realmSlug, guildName, region = 'eu') {
  const userCharacters = await listUserCharacters(token, region, false);

  const guildRoster = await validateGuildExists(token, realmSlug, guildName, region);

  const normalizedRealmSlug = realmSlug.trim().toLowerCase().replace(/\s+/g, '-');

  const hasCharacterInGuild = userCharacters.some((userChar) => {
    const userCharRealm = userChar.realm?.slug?.toLowerCase();
    const userCharName = userChar.name?.toLowerCase();

    return guildRoster.some((guildMember) => {
      const guildMemberName = guildMember.name?.toLowerCase();
      const guildMemberRealm = guildMember.realm?.toLowerCase();

      return (
        userCharName === guildMemberName &&
        (userCharRealm === guildMemberRealm || userCharRealm === normalizedRealmSlug)
      );
    });
  });

  return hasCharacterInGuild;
}

/**
 * @param {string} token
 * @param {string} realmSlug
 * @param {string} characterName
 * @param {string} region
 */
async function getCharacterProfile(token, realmSlug, characterName, region = 'eu') {
  const host = region === 'cn' ? 'gateway.battlenet.com.cn' : `${region}.api.blizzard.com`;
  const realm = realmSlug.trim().toLowerCase().replace(/\s+/g, '-');
  const name = characterName.trim().toLowerCase();

  // NOTE: Profile endpoint requires lowercase Name and Realm
  const url = `https://${host}/profile/wow/character/${realm}/${name}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        namespace: blizzardNamespace('profile', region),
        locale: 'en_GB',
      },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching profile for ${name}-${realm}:`,
      error?.response?.data || error.message,
    );
    return null;
  }
}
module.exports = {
  listUserCharacters,
  getGuildRoster,
  validateGuildExists,
  validateUserInGuild,
  getCharacterProfile,
};
