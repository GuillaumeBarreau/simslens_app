const axios = require('axios');
const { importJWK, jwtVerify } = require('jose');

const SAFE_HOSTNAME_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

function parseClerkHost(publishableKey) {
  if (typeof publishableKey !== 'string' || !/^pk_(test|live)_/.test(publishableKey)) {
    return null;
  }
  const b64 = publishableKey.replace(/^pk_(test|live)_/, '');
  const decoded = Buffer.from(b64, 'base64').toString('utf-8').replace(/\$$/, '');
  return SAFE_HOSTNAME_RE.test(decoded) ? decoded : null;
}

function parseAllowedAdminIds(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? new Set(ids) : null;
}

const CLERK_HOST = parseClerkHost(process.env.CLERK_PUBLISHABLE_KEY || '');
const CLERK_ISSUER = CLERK_HOST ? `https://${CLERK_HOST}` : null;
const JWKS_URL = CLERK_ISSUER ? `${CLERK_ISSUER}/.well-known/jwks.json` : null;

const keyCache = {};

async function getKey(kid) {
  if (!JWKS_URL) {
    throw new Error('CLERK_PUBLISHABLE_KEY is not configured or invalid');
  }
  if (keyCache[kid]) return keyCache[kid];

  const { data } = await axios.get(JWKS_URL, { timeout: 5000 });
  for (const jwk of data.keys || []) {
    keyCache[jwk.kid] = await importJWK(jwk, 'RS256');
  }

  if (!keyCache[kid]) throw new Error(`JWK not found for kid: ${kid}`);
  return keyCache[kid];
}

/**
 * Verifies the Clerk session JWT:
 * - Signature (RS256) against the Clerk instance's JWKS
 * - Issuer (`iss`) matching `https://<clerk-host>`
 * - Optional admin user ID allowlist via `CLERK_ADMIN_USER_IDS` (comma-separated `sub` values)
 */
async function clerkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!CLERK_ISSUER) {
    console.error('[clerkAuth] CLERK_PUBLISHABLE_KEY is missing or invalid');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7).trim();
  try {
    const [rawHeader] = token.split('.');
    const { kid } = JSON.parse(Buffer.from(rawHeader, 'base64url').toString());
    if (!kid || typeof kid !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const key = await getKey(kid);
    const { payload } = await jwtVerify(token, key, {
      issuer: CLERK_ISSUER,
      algorithms: ['RS256'],
    });

    const allowedAdmins = parseAllowedAdminIds(process.env.CLERK_ADMIN_USER_IDS);
    if (allowedAdmins && (!payload.sub || !allowedAdmins.has(payload.sub))) {
      console.warn(`[clerkAuth] Forbidden admin access attempt by sub=${payload.sub}`);
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.auth = { userId: payload.sub };
    return next();
  } catch (err) {
    console.error('[clerkAuth] Token verification failed:', err?.message ?? err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = clerkAuth;
module.exports.parseClerkHost = parseClerkHost;
module.exports.parseAllowedAdminIds = parseAllowedAdminIds;
