const axios = require('axios');
const config = require('../../shared/config');
let token = null;
let expiresAt = 0;
let pendingFetch = null;

async function fetchToken(clientId, clientSecret, origin = 'eu') {
  const maxAttempts = 3;
  let attempt = 0;
  let lastErr = null;

  while (attempt < maxAttempts) {
    try {
      const resp = await axios.post(
        `https://oauth.battle.net/token`,
        'grant_type=client_credentials',
        {
          auth: {
            username: clientId,
            password: clientSecret,
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      token = resp.data.access_token;
      const expiresIn = resp.data.expires_in || 86399;
      expiresAt = Date.now() + expiresIn * 1000;
      return token;
    } catch (e) {
      lastErr = e;
      attempt += 1;
      const backoffMs = 2 ** attempt * 250;
      console.warn(`fetchToken attempt ${attempt} failed, retrying in ${backoffMs}ms`);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  console.error(
    'Error fetching Blizzard application token after retries',
    lastErr?.response?.data || lastErr?.message || lastErr,
  );
  throw lastErr;
}

function getToken() {
  return token;
}

function regionHost(region) {
  const map = {
    us: 'us.api.blizzard.com',
    eu: 'eu.api.blizzard.com',
    kr: 'kr.api.blizzard.com',
    tw: 'tw.api.blizzard.com',
    cn: 'gateway.battlenet.com.cn',
  };

  return map[region.toLowerCase()] || map['eu'];
}

async function ensureToken(clientId, clientSecret, origin = 'us') {
  if (token && expiresAt && Date.now() < expiresAt - 1000) {
    return { token, expiresAt };
  }
  if (pendingFetch) return pendingFetch;
  pendingFetch = fetchToken(clientId, clientSecret, origin)
    .then((t) => {
      pendingFetch = null;
      return { token: t, expiresAt };
    })
    .catch((err) => {
      pendingFetch = null;
      throw err;
    });
  return await pendingFetch;
}

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} url - URL complète de l'API Blizzard (ex: https://eu.api.blizzard.com/...)
 * @param {object} [params] - Query params à passer à l'API
 * @param {string} [origin] - 'eu', 'us', etc.
 * @returns {Promise<any>}
 */
async function fetchFromAPI(url, params = {}, origin = 'eu') {
  const { token } = await ensureToken(config.bnet.id, config.bnet.secret, origin);
  const headers = {
    Authorization: `Bearer ${token}`,
  };
  const response = await axios.get(url, { headers, params });
  return response.data;
}

module.exports = { fetchToken, getToken, ensureToken, fetchFromAPI, regionHost };
