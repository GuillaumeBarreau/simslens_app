const axios = require('axios');
const config = require('../../shared/config');

/**
 * @param {string} refreshToken
 * @param {string} region
 * @returns {Promise<{access_token: string, expires_in: number, refresh_token: string}>}
 */
const refreshAccessToken = async (refreshToken, region = 'eu') => {
  const host = region === 'cn' ? 'gateway.battlenet.com.cn' : `${region}.battle.net`;
  const url = `https://${host}/oauth/token`;

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);

    const auth = Buffer.from(`${config.bnet.id}:${config.bnet.secret}`).toString('base64');

    const response = await axios.post(url, params, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Failed to refresh Battle.net token:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Check if the token is expired or about to expire (within 5 minutes)
 * @param {object} user - User session object
 * @returns {boolean}
 */
const isTokenExpired = (user) => {
  if (!user || !user.expiresAt) return true;
  return Date.now() > user.expiresAt - 300000;
};

module.exports = {
  refreshAccessToken,
  isTokenExpired,
};
