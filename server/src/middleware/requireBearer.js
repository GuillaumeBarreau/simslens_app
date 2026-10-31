/**
 * Require an authenticated request via Bearer token (not session).
 * Used by endpoints intended for desktop companions / external integrations.
 * `authBearer` runs upstream and sets `req.tokenScopes` if a valid Bearer
 * token was presented.
 */
function requireBearer(req, res, next) {
  if (!req.tokenScopes) {
    return res.status(401).json({ error: 'bearer_token_required' });
  }
  next();
}

/**
 * Require a specific static scope to be present in the Bearer token.
 * For realm-scoped checks (e.g. `realm:42`), use this inline since the
 * realmId is only known after parsing the request body.
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (!req.tokenScopes || !req.tokenScopes.includes(scope)) {
      return res.status(403).json({ error: 'missing_scope', required: scope });
    }
    next();
  };
}

module.exports = { requireBearer, requireScope };
