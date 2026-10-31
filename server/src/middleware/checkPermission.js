const realmRepo = require('../api/realm/realm.repository');
const characterRepo = require('../api/character/character.repository');
const eventRepo = require('../api/event/event.repository');
const adminRole = require('../shared/config/permissions/role_admin.json');
const moderatorRole = require('../shared/config/permissions/role_moderator.json');
const memberRole = require('../shared/config/permissions/role_member.json');
const guestRole = require('../shared/config/permissions/role_guest.json');
const { isInternalCall: isInternalRequest } = require('./requireUserOrInternal');
const { strictId } = require('../shared/strictId');

/**
 * Ressource désignée par `:id` : un personnage sous `/character(s)`, un
 * événement sous `/events`. Décidé sur les segments du chemin, sans la query
 * string et sans tenir compte de la casse : Express route `/1/Character/5`
 * comme `/1/character/5` (SIMS-173).
 *
 * @returns {'character' | 'event' | null}
 */
function routeResourceKind(req) {
  const segments = `${req.baseUrl}${req.path}`.toLowerCase().split('/');
  if (segments.includes('character') || segments.includes('characters')) return 'character';
  if (segments.includes('events')) return 'event';
  return null;
}

/** Ressource d'un autre royaume que celui dont les droits sont vérifiés. */
function outOfRealm(res, req, realmId) {
  console.warn(`[Permission] Resource of ${req.originalUrl} is outside realm ${realmId}`);
  return res.status(403).json({ error: 'Forbidden: Insufficient Permissions' });
}

/**
 * Middleware Factor to check authorization
 * @param {string} requiredPermission - Permission key from keys.ts
 * @param {{ allowSelfEdit?: boolean }} [options]
 *   allowSelfEdit – if true, a user may perform the action on a character they own
 *   even if their role does not normally grant `requiredPermission`.
 */
const checkPermission = (requiredPermission, options = {}) => {
  return async (req, res, next) => {
    const userId = req.user?.id;
    const isInternalCall = isInternalRequest(req);
    // Lu par les controllers qui n'honorent certains en-têtes que pour le bot
    // (ex. x-acting-discord-tag sur les inscriptions, SIMS-166).
    req.isInternalCall = isInternalCall;

    if (!userId && !isInternalCall) {
      console.error('[checkPermission] No userId and no internal token found!');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Identifiants lus strictement (strictId) : une valeur que parseInt et Joi
    // liraient différemment, comme "1e1", est refusée ici (SIMS-173).
    const invalidId = () => res.status(400).json({ error: 'invalid_id' });
    const kind = routeResourceKind(req);
    const rawCharacterId = req.params.characterId || (kind === 'character' && req.params.id);
    const characterId = rawCharacterId ? strictId(rawCharacterId) : null;
    const rawEventId = req.params.eventId || (kind === 'event' && req.params.id);
    const eventId = rawEventId ? strictId(rawEventId) : null;
    if (Number.isNaN(characterId) || Number.isNaN(eventId)) return invalidId();

    let char = null;
    try {
      // Toutes les sources de royaume présentes doivent concorder : sinon un
      // client ajouterait ?realmId=<son royaume> à une route qui en désigne un
      // autre, par :realmId ou par le corps (SIMS-173).
      const claimed = [req.query.realmId, req.body?.realmId, req.params.realmId]
        .filter(Boolean)
        .map(strictId);
      if (claimed.some(Number.isNaN)) return invalidId();
      if (req.params.guildName) {
        const region = req.params.region || req.query.region || 'eu';
        const realm = await realmRepo.findRealmByNameAndRegion(req.params.guildName, region);
        if (realm) claimed.push(realm.id);
      }
      if (new Set(claimed).size > 1) {
        return res.status(400).json({ error: 'realm_conflict' });
      }
      let realmId = claimed[0] ?? null;

      // La ressource de la route doit appartenir au royaume contrôlé. Un
      // événement fait foi quand la route en porte un : un personnage passé
      // depuis dans une autre guilde reste gérable sur les événements de
      // l'ancienne. Une ressource introuvable, ou un personnage encore sans
      // royaume, est laissée aux usecases.
      if (eventId) {
        const event = await eventRepo.findById(eventId);
        if (event?.realmId) {
          if (realmId && event.realmId !== realmId) return outOfRealm(res, req, realmId);
          realmId = event.realmId;
        }
      }

      if (characterId) {
        char = await characterRepo.findCharacterById(characterId);
        if (char?.realmId && !eventId) {
          if (realmId && char.realmId !== realmId) return outOfRealm(res, req, realmId);
          realmId = char.realmId;
        }
      }

      if (!realmId) {
        console.warn(`[Permission] Could not determine Realm Scope for ${req.originalUrl}`);
        return res.status(400).json({ error: 'Realm Context Missing' });
      }

      let role = null;
      if (isInternalCall) {
        role = 'admin';
      } else {
        role = await realmRepo.getRealmUserRole(realmId, userId);
      }

      let permissions = {};
      if (role === 'admin' || role === 'owner') permissions = adminRole;
      else if (role === 'moderator') permissions = moderatorRole;
      else if (role === 'member') permissions = memberRole;
      else if (role === 'guest') permissions = guestRole;

      if (permissions[requiredPermission] === true) {
        req.realmRole = role;
        req.realmId = realmId;
        next();
      } else if (options.allowSelfEdit && userId) {
        if (characterId) {
          if (char && char.userId && String(char.userId) === String(userId)) {
            req.realmRole = role;
            req.realmId = realmId;
            return next();
          }
        }
        console.log(
          `[Permission] Self-edit denied for user ${userId} on character ${characterId} (not owner)`,
        );
        return res.status(403).json({ error: 'Forbidden: Insufficient Permissions' });
      } else {
        console.log(
          `[Permission] Denied ${requiredPermission} for user ${req.user.id} (Role: ${role}) on Realm ${realmId}`,
        );
        return res.status(403).json({ error: 'Forbidden: Insufficient Permissions' });
      }
    } catch (err) {
      console.error('[Permission] Middleware Error', err);
      return res.status(500).json({ error: 'Authorization Error' });
    }
  };
};

module.exports = checkPermission;
