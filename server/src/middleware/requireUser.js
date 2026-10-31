/**
 * Require an authenticated session user.
 *
 * Pendant de requireBearer pour les routes navigateur : passport renseigne
 * `req.user`, et les handlers n'ont plus à répéter le même garde-fou.
 *
 * @type {import('express').RequestHandler}
 */
function requireUser(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = requireUser;
