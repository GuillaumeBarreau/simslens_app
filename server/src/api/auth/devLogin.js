/**
 * Connexion de développement — GET /auth/dev-login?userId=<id Battle.net>
 *
 * Ouvre une session pour un utilisateur des données de test, sans passer par
 * Battle.net, pour que les agents (et les humains) puissent tester et capturer en
 * local les pages qui exigent d'être connecté.
 *
 * Elle n'existe que si TOUTES ces conditions sont réunies, sinon la route répond 404
 * comme si elle n'existait pas :
 *   1. NODE_ENV === 'development' ;
 *   2. ENABLE_DEV_LOGIN === '1' (jamais défini en production) ;
 *   3. CLIENT_URL pointe sur localhost ;
 *   4. la requête vient de la machine elle-même (adresse TCP de bouclage — on ne lit
 *      pas X-Forwarded-For, que le client peut forger).
 *
 * La session n'a pas de token Blizzard : les quelques routes qui appellent Battle.net
 * avec le token de l'utilisateur (synchronisation des personnages, création de
 * royaume, import de guilde, détail d'objet) répondent 401. Toutes les pages qui
 * lisent la base fonctionnent.
 */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const ONE_YEAR_MS = 365 * 24 * 3600 * 1000;

function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Raison du refus, ou null si la connexion de dev est autorisée. */
function devLoginBlockReason({ nodeEnv, enableFlag, clientUrl, remoteAddress }) {
  if (nodeEnv !== 'development') return 'NODE_ENV n’est pas development';
  if (enableFlag !== '1') return 'ENABLE_DEV_LOGIN n’est pas à 1';
  if (!isLocalUrl(clientUrl)) return 'CLIENT_URL n’est pas local';
  if (!LOOPBACK.has(remoteAddress)) return `requête non locale (${remoteAddress})`;
  return null;
}

/** Utilisateur de session au même format que celui de passport-bnet, sans token. */
function buildDevUser(userId) {
  return {
    id: userId,
    battletag: `Dev#${userId}`,
    token: null,
    refreshToken: null,
    // Loin dans le futur : sinon ensureValidToken tenterait un refresh impossible
    // et déconnecterait l'utilisateur.
    expiresAt: Date.now() + ONE_YEAR_MS,
    provider: 'dev',
  };
}

/**
 * Chemin de redirection côté client : uniquement un chemin interne (« /roster »).
 * Refuse « //hôte », les antislashs et tout ce qui n'est pas un chemin.
 */
function safeRedirectPath(value) {
  const isInternalPath =
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\');
  return isInternalPath ? value : '/redirect';
}

function createDevLogin({ env, clientUrl, findCharactersByUserId, logger = console }) {
  return async function devLogin(req, res, next) {
    const reason = devLoginBlockReason({
      nodeEnv: env.NODE_ENV,
      enableFlag: env.ENABLE_DEV_LOGIN,
      clientUrl,
      remoteAddress: req.socket && req.socket.remoteAddress,
    });
    if (reason) {
      if (env.ENABLE_DEV_LOGIN === '1') logger.warn(`[Auth] dev-login refusé : ${reason}`);
      return res.status(404).json({ error: 'Not Found' });
    }

    const userId = String(req.query.userId || '');
    if (!/^\d{1,20}$/.test(userId)) {
      return res.status(400).json({
        error: 'userId requis',
        message: 'Passer ?userId=<identifiant Battle.net d’un utilisateur des données de test>.',
      });
    }

    try {
      const characters = await findCharactersByUserId(userId);
      if (!characters || characters.length === 0) {
        return res.status(400).json({
          error: 'Utilisateur inconnu',
          message: `Aucun personnage rattaché à l’utilisateur ${userId} : lancer npm run server:init-fake-data ou choisir un autre userId.`,
        });
      }

      const user = buildDevUser(userId);
      req.logIn(user, (err) => {
        if (err) return next(err);
        logger.warn(`[Auth] ⚠️ Connexion de développement : ${user.battletag}`);
        res.redirect(`${clientUrl}${safeRedirectPath(req.query.redirect)}`);
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  createDevLogin,
  devLoginBlockReason,
  buildDevUser,
  safeRedirectPath,
  isLocalUrl,
};
