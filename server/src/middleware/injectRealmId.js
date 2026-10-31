const { strictId } = require('../shared/strictId');

/**
 * Extracts realmId from the request (query, body, params) and sets it on req.realmId.
 * Does NOT block requests without realmId — some routes (auth, global items) don't need one.
 * This is a complement to checkPermission, not a replacement:
 *   - checkPermission: verifies permissions + sets req.realmId (used on protected write routes)
 *   - injectRealmId: just sets req.realmId (used globally for convenience)
 *
 * If checkPermission already set req.realmId, this middleware is a no-op.
 */
function injectRealmId(req, res, next) {
  if (req.realmId) return next();

  let realmId = null;

  // Lecture stricte, comme checkPermission : "1e1" n'est pas un royaume (SIMS-173).
  if (req.query.realmId) {
    realmId = strictId(req.query.realmId);
  } else if (req.body && req.body.realmId) {
    realmId = strictId(req.body.realmId);
  } else if (req.params.realmId) {
    realmId = strictId(req.params.realmId);
  }

  if (realmId && !isNaN(realmId)) {
    req.realmId = realmId;
  }

  next();
}

module.exports = injectRealmId;
