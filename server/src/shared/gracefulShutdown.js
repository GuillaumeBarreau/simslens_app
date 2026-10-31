const SHUTDOWN_TIMEOUT = 10000;

let isShuttingDown = false;
let shutdownServer = null;
let shutdownPrisma = null;
let shutdownRedis = null;
/** @type {Array<{ name: string, close: () => Promise<void> }>} */
let shutdownQueueClosers = [];

/**
 * @param {http.Server} server - HTTP server instance
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {RedisClient} redis - Redis client instance
 * @param {{
 *   closeReportQueue?: () => Promise<void>,
 *   closeEventSeriesJob?: () => Promise<void>,
 * }} [options]
 */
function setupGracefulShutdown(server, prisma, redis, options = {}) {
  shutdownServer = server;
  shutdownPrisma = prisma;
  shutdownRedis = redis;
  shutdownQueueClosers = [
    { name: 'report queue', close: options.closeReportQueue },
    { name: 'event series job', close: options.closeEventSeriesJob },
  ].filter((closer) => typeof closer.close === 'function');

  console.log('✅ [Shutdown] Graceful shutdown handlers configured');
}

/**
 * Ferme les files BullMQ en parallèle : elles sont indépendantes, et le délai
 * de SHUTDOWN_TIMEOUT est commun. L'échec de l'une n'empêche pas les autres.
 * @param {Array<{ name: string, close: () => Promise<void> }>} closers
 */
async function closeQueues(closers) {
  await Promise.all(
    closers.map(async ({ name, close }) => {
      try {
        await close();
      } catch (err) {
        console.error(`❌ [Shutdown] Error closing ${name}:`, err.message);
      }
    }),
  );
}

/**
 * @returns {Promise<void>}
 */
async function closeServer() {
  if (!shutdownServer) {
    console.log('⚠️  [Shutdown] No HTTP server to close');
    return;
  }

  return new Promise((resolve) => {
    console.log('🔄 [Shutdown] Closing HTTP server (stop accepting new connections)...');

    shutdownServer.close((err) => {
      if (err) {
        console.error('❌ [Shutdown] Error closing HTTP server:', err.message);
      } else {
        console.log('✅ [Shutdown] HTTP server closed');
      }
      resolve();
    });
  });
}

/**
 * @returns {Promise<void>}
 */
async function closePrisma() {
  if (!shutdownPrisma) {
    console.log('⚠️  [Shutdown] No Prisma client to close');
    return;
  }

  try {
    console.log('🔄 [Shutdown] Closing Prisma client...');
    await shutdownPrisma.$disconnect();
    console.log('✅ [Shutdown] Prisma client disconnected');
  } catch (err) {
    console.error('❌ [Shutdown] Error closing Prisma:', err.message);
  }
}

/**
 * @returns {Promise<void>}
 */
async function closeRedis() {
  if (!shutdownRedis) {
    console.log('⚠️  [Shutdown] No Redis client to close');
    return;
  }

  try {
    console.log('🔄 [Shutdown] Closing Redis client...');
    await shutdownRedis.quit();
    console.log('✅ [Shutdown] Redis client disconnected');
  } catch (err) {
    console.error('❌ [Shutdown] Error closing Redis:', err.message);
  }
}

/**
 * @param {number} exitCode - Process exit code (0 = success, 1 = error)
 * @param {string} reason - Reason for shutdown
 */
async function initiateShutdown(exitCode = 0, reason = 'Unknown') {
  if (isShuttingDown) {
    console.log('⚠️  [Shutdown] Shutdown already in progress, ignoring...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🔄 [Shutdown] Initiating graceful shutdown (Reason: ${reason})`);
  console.log(`🔄 [Shutdown] Exit code: ${exitCode}`);

  const forceExitTimer = setTimeout(() => {
    console.error('❌ [Shutdown] Timeout reached! Forcing exit...');
    process.exit(exitCode);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Close resources in sequence: stop accepting requests, drain the queue,
    // then disconnect data stores. Queue must drain before Prisma/Redis close
    // because in-flight jobs use both.
    await closeServer();
    await closeQueues(shutdownQueueClosers);
    await closePrisma();
    await closeRedis();

    console.log('✅ [Shutdown] Graceful shutdown complete');

    clearTimeout(forceExitTimer);

    process.exit(exitCode);
  } catch (err) {
    console.error('❌ [Shutdown] Error during shutdown:', err);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

module.exports = {
  setupGracefulShutdown,
  initiateShutdown,
  closeQueues,
};
