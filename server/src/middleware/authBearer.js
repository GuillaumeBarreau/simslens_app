const crypto = require('node:crypto');
const { prisma } = require('../data');

/**
 * Resolve a Bearer token from the Authorization header into a fake passport
 * user object (`req.user = { id, battletag? }`). No-op if:
 *   - the request already has a passport session user, or
 *   - no Authorization: Bearer header is present.
 *
 * The downstream `checkPermission` middleware only reads `req.user.id`, so a
 * valid Bearer call is indistinguishable from a session call from that point on.
 *
 * Tokens are stored hashed (SHA-256); the raw value is only known to the
 * device that holds it.
 */
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function authBearer(req, res, next) {
  if (req.user) return next();

  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();

  const raw = header.slice('Bearer '.length).trim();
  if (!raw) return next();

  try {
    const record = await prisma.api_tokens.findUnique({
      where: { tokenHash: hashToken(raw) },
    });

    if (!record || record.revokedAt) {
      return res.status(401).json({ error: 'invalid_token' });
    }
    if (record.expiresAt && record.expiresAt < new Date()) {
      return res.status(401).json({ error: 'expired_token' });
    }

    prisma.api_tokens
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => console.error('[authBearer] lastUsedAt update failed:', err.message));

    req.user = { id: record.userId };
    req.tokenScopes = record.scopes || [];
    req.tokenId = record.id;
    return next();
  } catch (err) {
    console.error('[authBearer] lookup failed:', err.message);
    return res.status(500).json({ error: 'auth_error' });
  }
}

module.exports = authBearer;
module.exports.hashToken = hashToken;
