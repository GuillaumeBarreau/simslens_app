const Redis = require('ioredis');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6380;

console.log(`🔄 [Redis] Connecting to ${redisHost}:${redisPort}...`);

const redis = new Redis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  console.error('❌ [Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log(`✅ [Redis] Connected successfully to ${redisHost}:${redisPort}`);
});

module.exports = redis;
