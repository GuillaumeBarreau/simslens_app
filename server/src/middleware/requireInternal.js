const { isInternalCall } = require('./requireUserOrInternal');

/**
 * Réserve une route au bot Discord : en-tête `x-internal-token` égal à
 * DISCORD_BOT_TOKEN (comparaison à temps constant). Une session utilisateur ne
 * suffit pas.
 *
 * Pour les routes que seul le bot appelle et qui exposeraient des données d'autres
 * joueurs à un utilisateur ordinaire (ex. personnage par tag Discord, SIMS-153).
 *
 * @type {import('express').RequestHandler}
 */
function requireInternal(req, res, next) {
  if (isInternalCall(req)) {
    req.isInternalCall = true;
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
}

module.exports = requireInternal;
