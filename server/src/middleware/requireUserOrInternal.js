const crypto = require('node:crypto');

/**
 * Exige un utilisateur authentifié (session passport ou jeton bearer de l'app
 * compagnon, qui renseignent `req.user`) **ou** un appel interne du bot Discord
 * (en-tête `x-internal-token` égal à DISCORD_BOT_TOKEN).
 *
 * Pour les routes appelées à la fois par l'application et par le bot, sans
 * contexte de royaume (ex. import des rapports Droptimizer, SIMS-151). Quand un
 * royaume est en jeu, préférer checkPermission, qui accepte aussi le jeton interne.
 *
 * @type {import('express').RequestHandler}
 */
function requireUserOrInternal(req, res, next) {
  if (req.user?.id) return next();
  if (isInternalCall(req)) {
    req.isInternalCall = true;
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

/** Compare le jeton interne à temps constant ; faux si l'un des deux manque. */
function isInternalCall(req) {
  const expected = process.env.DISCORD_BOT_TOKEN;
  const received = req.headers['x-internal-token'];
  if (!expected || typeof received !== 'string' || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = requireUserOrInternal;
module.exports.isInternalCall = isInternalCall;
