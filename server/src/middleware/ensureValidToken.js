const tokenService = require('../api/auth/token.service');

/**
 * Middleware to ensure the user has a valid access token.
 * If the token is expired, it attempts to refresh it.
 */
const ensureValidToken = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return next();
  }

  if (tokenService.isTokenExpired(req.user)) {
    console.log(`[Auth] Token for user ${req.user.battletag} expired. Refreshing...`);

    if (!req.user.refreshToken) {
      console.warn(`[Auth] No refresh token for user ${req.user.battletag}. forcing re-login.`);
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        return res.status(401).json({ error: 'Token expired and no refresh token available' });
      });
      return;
    }

    try {
      const tokens = await tokenService.refreshAccessToken(req.user.refreshToken);

      req.user.token = tokens.access_token;
      // Bnet docs say: "Refresh tokens do not expire, but they can be invalidated."
      if (tokens.refresh_token) {
        req.user.refreshToken = tokens.refresh_token;
      }

      req.user.expiresAt = Date.now() + (tokens.expires_in || 86400) * 1000;

      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Failed to save session after token refresh:', err);
        } else {
          console.log(`[Auth] Token refreshed successfully for ${req.user.battletag}`);
        }
        next();
      });
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error.message);
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        return res.status(401).json({ error: 'Token refresh failed' });
      });
    }
  } else {
    next();
  }
};

module.exports = ensureValidToken;
