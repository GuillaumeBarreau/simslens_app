require('dotenv').config();

const express = require('express');
const createError = require('http-errors');
const logger = require('morgan');
const session = require('express-session');
const redis = require('./shared/redis');
const config = require('./shared/config');
const passport = require('./api/auth/passport');
const errorHandler = require('./shared/middleware/errorHandler');

const { routes: characterRoutes } = require('./api/character');
const { routes: raidsRoutes } = require('./api/raid_listed');
const { routes: upgradeRoutes } = require('./api/item_upgrade');
const { routes: itemListedRoutes } = require('./api/item_listed');
const { routes: bossListedRoutes } = require('./api/boss_listed');
const { routes: instanceRoutes } = require('./api/instance');
const { routes: importRoutes } = require('./api/item_import');
const { routes: lootRoutes } = require('./api/item_dropped');
const { routes: instanceBossKilled } = require('./api/instance_boss_killed');
const { routes: realmRoutes } = require('./api/realm');
const { routes: regionRoutes } = require('./api/region');
const { routes: blizzardRoutes } = require('./api/blizzard');
const { routes: authRoutes } = require('./api/auth');
const { routes: tokenRoutes } = require('./api/item_tokens');
const { routes: wishlistRoutes } = require('./api/wishlist');
const { routes: talentRoutes } = require('./api/talent');
const { routes: eventRoutes } = require('./api/event');
const { routes: signupRoutes } = require('./api/signup');
const { routes: guestRoutes } = require('./api/guest');
const { routes: absenceRoutes } = require('./api/absence');
const { routes: dungeonAvailabilityRoutes } = require('./api/dungeon_availability');
const { routes: dungeonGroupRoutes } = require('./api/dungeon_group');
const { routes: rosterRoutes } = require('./api/roster');
const { routes: bossNoteRoutes } = require('./api/boss_note');
const { routes: attunementRoutes } = require('./api/attunement');
const { routes: bisListRoutes } = require('./api/bis_list');
const { routes: compositionRoutes } = require('./api/composition');
const { routes: enchantmentsRoutes } = require('./api/enchantments');
const { routes: itemRoutes } = require('./api/item');
const { routes: validationSettingsRoutes } = require('./api/validation_settings');
const { routes: activityLogRoutes } = require('./api/activity_log');
const { routes: raidItemsRoutes } = require('./api/raid_items');
const { routes: adminRoutes } = require('./api/admin');
const { routes: inviteRoutes } = require('./api/invite');
const { routes: attendanceRoutes } = require('./api/attendance');
const { routes: deviceAuthRoutes } = require('./api/device_auth');
const { routes: syncLootRoutes } = require('./api/sync_loot');

const helmet = require('helmet');
const dataUpdater = require('./dataUpdater');
const { scheduleCharacterUpdates } = require('./shared/utils/scheduler');
const { scheduleRaidReminders } = require('./scheduler/raidReminders');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(logger('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

let sessionStore;
try {
  const RedisStore = require('connect-redis')(session);
  sessionStore = new RedisStore({ client: redis, prefix: 'sess:' });
} catch (error) {
  console.warn(
    '⚠️  [Sessions] Redis not available, using memory store (sessions will not persist across restarts)',
  );
  sessionStore = undefined;
}

app.use(
  session({
    store: sessionStore,
    secret: config.resolveSessionSecret(config.SESSION_SECRET, config.env),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.urls.client?.startsWith('https') && config.env === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
      sameSite:
        config.urls.client?.startsWith('https') && config.env === 'production' ? 'none' : 'lax',
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

const ensureValidToken = require('./middleware/ensureValidToken');
app.use(ensureValidToken);

const authBearer = require('./middleware/authBearer');
app.use(authBearer);

const injectRealmId = require('./middleware/injectRealmId');
app.use(injectRealmId);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173', // Vite default
    'http://localhost:5000', // Local server
    'http://localhost:3000', // Alternative React port
    config.urls.client, // Production Client URL
  ].filter(Boolean);

  if (!origin) {
    return next();
  }

  const isAllowed =
    allowedOrigins.includes(origin) ||
    (config.env === 'development' && origin.startsWith('http://localhost:'));

  if (isAllowed) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    res.set('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, PATCH, HEAD, OPTIONS');
    res.set('Access-Control-Allow-Credentials', 'true');
  } else {
    return next(createError(403, 'Not allowed by CORS'));
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/1/character', characterRoutes);
app.use('/1/upgrade', upgradeRoutes);
app.use('/1/update', dataUpdater);
app.use('/1/item', itemListedRoutes);
app.use('/1/import', importRoutes);
app.use('/1/instance', instanceRoutes);
app.use('/1/instances/:instanceId/bosses', instanceBossKilled);
app.use('/1/bosses', bossListedRoutes);
app.use('/1/raids', raidsRoutes);
app.use('/1/loots', lootRoutes);
app.use('/1/realms', realmRoutes);
app.use('/1/regions', regionRoutes);
app.use('/1/blizzard', blizzardRoutes);
app.use('/1', wishlistRoutes);
app.use('/1', talentRoutes);
app.use('/1', tokenRoutes);
app.use('/1/events', signupRoutes);
app.use('/1/events', guestRoutes);
app.use('/1/events', rosterRoutes);
app.use('/1/events', bossNoteRoutes);
app.use('/1/events', compositionRoutes);
app.use('/1/events', eventRoutes);
app.use('/1/absences', absenceRoutes);
app.use('/1/dungeon-availability', dungeonAvailabilityRoutes);
app.use('/1/dungeon-groups', dungeonGroupRoutes);
app.use('/1/enchantments', enchantmentsRoutes);
app.use('/1/items', itemRoutes);
app.use('/1/validation_settings', validationSettingsRoutes);
app.use('/1/activity', activityLogRoutes);
app.use('/1/extensions', raidItemsRoutes);
app.use('/admin', adminRoutes);
app.use('/1/invite', inviteRoutes);
app.use('/1/attendance', attendanceRoutes);
app.use('/1/auth', deviceAuthRoutes);
app.use('/1/sync', syncLootRoutes);
app.use('/1/attunements', attunementRoutes);
app.use('/1/bis', bisListRoutes);

scheduleCharacterUpdates();
scheduleRaidReminders();

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(errorHandler);

const gracefulShutdown = require('./shared/gracefulShutdown');

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection detected');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('Stack:', reason?.stack);

  gracefulShutdown.initiateShutdown(1, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception detected');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  gracefulShutdown.initiateShutdown(1, 'Uncaught Exception');
});

process.on('SIGTERM', () => {
  console.log('📡 SIGTERM signal received');
  gracefulShutdown.initiateShutdown(0, 'SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT signal received (Ctrl+C)');
  gracefulShutdown.initiateShutdown(0, 'SIGINT');
});

module.exports = app;
