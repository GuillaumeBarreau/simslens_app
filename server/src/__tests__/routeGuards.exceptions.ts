/**
 * Routes montées SANS garde (checkPermission, requireUser, requireBearer,
 * requireUserOrInternal, clerkAuth),
 * chacune avec sa raison. Lu par routeGuards.test.ts.
 *
 * C'est le tableau de bord de l'objectif « aucune donnée de guilde ne peut être lue,
 * modifiée ou effacée sans droit sur cette guilde » : cette liste ne doit que
 * raccourcir. Protéger une route → retirer sa ligne (le test l'exige).
 * Ajouter une route publique → l'ajouter ici avec une raison, en revue humaine.
 *
 * État au 2026-10-07 : 70 routes sans garde sur 162.
 */

const R = {
  AUTH: 'public : flux de connexion (Battle.net, Discord ; dev-login répond 404 hors développement local)',
  DEVICE:
    'public : flux OAuth « device code » de l’app compagnon (le code à usage unique fait office de secret)',
  INVITE: 'public : vérification d’un code d’invitation, avant connexion',
  CALENDAR_FEED:
    'public : flux iCal lu par un agenda sans session ; le jeton de l’URL (256 bits aléatoires, stocké haché, révocable) authentifie le joueur et ne donne accès qu’à ses soirées',
  GAME_DATA:
    'public : données de jeu communes à toutes les guildes (objets, boss, raids, régions, tokens)',
  CONTROLLER:
    'identité contrôlée dans le contrôleur (req.user absent → 401) : à remonter en middleware (O1)',
  BOT: 'appelée par le bot Discord sans session : garde « utilisateur ou x-internal-token » à créer (O1)',
  READ: 'à protéger (O1) : données de guilde lisibles sans authentification',
  WRITE: 'à protéger en priorité (O1) : écriture sans authentification ni permission',
} as const;

export const ROUTE_GUARD_EXCEPTIONS: Record<string, string> = {
  // auth
  'GET /auth/bnet': R.AUTH,
  'GET /auth/dev-login': R.AUTH,
  'GET /auth/bnet/callback': R.AUTH,
  'GET /auth/me': R.AUTH,
  'GET /auth/logout': R.AUTH,
  'GET /auth/discord': R.AUTH,
  'GET /auth/discord/callback': R.AUTH,

  // device_auth (app compagnon)
  'POST /1/auth/device/code': R.DEVICE,
  'POST /1/auth/device/token': R.DEVICE,
  'GET /1/auth/device/pending/:userCode': R.DEVICE,
  'POST /1/auth/device/approve': R.CONTROLLER,
  'GET /1/auth/tokens': R.CONTROLLER,
  'DELETE /1/auth/tokens/:id': R.CONTROLLER,

  // invite
  'GET /1/invite/:code': R.INVITE,

  // données de jeu
  'GET /1/item/:itemID': R.GAME_DATA,
  'GET /1/items/:itemId': R.GAME_DATA,
  'GET /1/items/:itemId/token-rewards': R.GAME_DATA,
  'GET /1/items/:itemId/is-token': R.GAME_DATA,
  'GET /1/tokens': R.GAME_DATA,
  'GET /1/bosses': R.GAME_DATA,
  'GET /1/raids': R.GAME_DATA,
  'GET /1/raids/bosses': R.GAME_DATA,
  'GET /1/raids/:raidId/bosses': R.GAME_DATA,
  'GET /1/regions': R.GAME_DATA,
  'GET /1/enchantments': R.GAME_DATA,
  'GET /1/extensions/:extension/seasons/:season/items/:slot': R.GAME_DATA,

  // character
  'GET /1/character': R.READ,
  'GET /1/character/roster-status': R.READ,
  'GET /1/character/roster': R.READ,
  'GET /1/character/pending': R.READ,
  'GET /1/character/gear/bulk': R.READ,
  'GET /1/character/keys/history': R.READ,
  'GET /1/character/:characterId/gear/latest': R.READ,
  'GET /1/character/:characterId/equipment/blizzard': R.READ,
  'GET /1/character/:characterId/mount/:mountId': R.READ,
  'GET /1/character/:name': R.READ,

  // upgrades (résultats de sims)
  'GET /1/upgrade': R.READ,
  'POST /1/upgrade/batch': R.READ,
  'POST /1/upgrade/wishlist-batch': R.READ,
  'GET /1/upgrade/by-boss/character/:characterId': R.READ,
  'GET /1/upgrade/byItem/:itemID/:difficulty': R.READ,
  'GET /1/upgrade/:name/:itemID/:difficulty': R.READ,

  // instances, loot
  'GET /1/instance': R.READ,
  'GET /1/instance/:id': R.READ,
  'GET /1/instances/:instanceId/bosses': R.READ,
  'GET /1/instances/:instanceId/bosses/:bossId': R.READ,
  'GET /1/loots': R.READ,
  'GET /1/loots/:id': R.READ,

  // royaumes et Blizzard
  'GET /1/realms': R.CONTROLLER,
  'GET /1/realms/check': R.READ,
  'GET /1/realms/:id': R.READ,
  'GET /1/blizzard/characters': R.CONTROLLER,
  'POST /1/blizzard/claim': R.CONTROLLER,

  // événements
  'GET /1/events': R.READ,
  'GET /1/events/:id': R.READ,
  'GET /1/events/:eventId/roster': R.READ,
  'GET /1/events/:eventId/roster-assignments': R.READ,
  'GET /1/events/:eventId/roster-pool': R.READ,
  'GET /1/events/:eventId/past-rosters': R.READ,
  'GET /1/events/calendar-feed/:file': R.CALENDAR_FEED,

  // absences, donjons, enchantements
  'GET /1/absences': R.READ,
  'GET /1/absences/:id': R.READ,
  'GET /1/dungeon-availability': R.READ,
  'GET /1/dungeon-availability/:id': R.READ,
  'GET /1/dungeon-groups': R.READ,
  'GET /1/dungeon-groups/:id': R.READ,
  'GET /1/enchantments/verify/bulk': R.READ,
  'GET /1/enchantments/verify/:characterId': R.READ,
};
