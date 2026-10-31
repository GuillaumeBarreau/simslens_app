const passport = require('passport');
const config = require('../../shared/config');
const usecases = require('./usecases');
const { strictId } = require('../../shared/strictId');

const loginBnet = passport.authenticate('bnet');

const loginBnetCallback = [
  (req, res, next) => {
    passport.authenticate('bnet', (err, user, info) => {
      if (err) {
        console.error('❌ [Auth] Passport error:', err.message || err);
        return res.redirect(`${config.urls.client}/login?error=auth_failed`);
      }
      if (!user) {
        console.error('❌ [Auth] Authentication failed. Info:', info);
        return res.redirect(`${config.urls.client}/login?error=auth_failed`);
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('❌ [Auth] Login error:', loginErr.message || loginErr);
          return res.redirect(`${config.urls.client}/login?error=auth_failed`);
        }
        console.log('✅ [Auth] Login successful for:', user.battletag);
        res.redirect(`${config.urls.client}/redirect`);
      });
    })(req, res, next);
  },
];

const getMe = async (req, res) => {
  res.json(req.isAuthenticated() ? await usecases.getUserProfile(req.user) : null);
};

const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(`${config.urls.client}/`);
  });
};

const DISCORD_CALLBACK_PAGE = `${config.urls.client}/discord-oauth-callback`;

/** Le flux OAuth répond toujours par redirection, jamais par un corps JSON. */
const redirectDiscordError = (res, error) =>
  res.redirect(`${DISCORD_CALLBACK_PAGE}?discord_error=${error}`);

/**
 * GET /auth/discord?characterId=X
 * Départ de la liaison Discord d'un personnage du joueur connecté.
 */
const linkDiscord = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect(`${config.urls.client}/login?error=auth_required`);
  }

  const characterId = strictId(req.query.characterId);
  if (Number.isNaN(characterId)) return redirectDiscordError(res, 'invalid_request');

  // Toujours une redirection : une base indisponible ne doit pas finir en JSON.
  let result;
  try {
    result = await usecases.startDiscordLink(req.user.id, characterId);
  } catch (err) {
    console.error('❌ [Discord OAuth] Start error:', err);
    return redirectDiscordError(res, 'server_error');
  }
  if (!result.ok) return redirectDiscordError(res, result.error);

  req.session.discordLink = result.link;
  req.session.save((err) => {
    if (err) {
      console.error('❌ [Discord OAuth] Session save error:', err);
      return redirectDiscordError(res, 'session_error');
    }
    res.redirect(result.authorizeUrl);
  });
};

/**
 * GET /auth/discord/callback?code=X
 * Retour de Discord : la liaison est terminée par le usecase.
 */
const linkDiscordCallback = async (req, res) => {
  const { code, state } = req.query;
  const link = req.session.discordLink;
  // Usage unique, succès ou échec : un retour rejoué ne trouve plus rien.
  delete req.session.discordLink;
  req.session.save((err) => {
    if (err) console.error('❌ [Discord OAuth] Session save error on callback:', err);
  });

  if (typeof code !== 'string' || !code || typeof state !== 'string' || !link) {
    console.error('❌ [Discord OAuth] Missing code, state or session data');
    return redirectDiscordError(res, 'missing_data');
  }

  // Exception assumée à la forme cible : une erreur inattendue doit finir en
  // redirection vers la page de retour, pas en JSON d'errorHandler.
  let result;
  try {
    result = await usecases.completeDiscordLink(
      { code, state, sessionUserId: req.isAuthenticated() ? req.user.id : undefined },
      link,
    );
  } catch (err) {
    console.error('❌ [Discord OAuth] Callback error:', err);
    return redirectDiscordError(res, 'server_error');
  }
  if (!result.ok) return redirectDiscordError(res, result.error);

  const redirectUrl = new URL(DISCORD_CALLBACK_PAGE);
  redirectUrl.searchParams.set('discord_success', '1');
  redirectUrl.searchParams.set('discord_tag', result.discordTag);
  return res.redirect(redirectUrl.toString());
};

module.exports = {
  loginBnet,
  loginBnetCallback,
  getMe,
  logout,
  linkDiscord,
  linkDiscordCallback,
};
