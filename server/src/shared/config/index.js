const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  BNET_ID: Joi.string().allow(null, '').required(),
  BNET_SECRET: Joi.string().allow(null, '').required(),
  ENABLE_DISCORD_BOT: Joi.boolean().default(false).required(),
  DISCORD_BOT_TOKEN: Joi.string().allow(null, '').required(),
  DISCORD_CLIENT_ID: Joi.string().allow(null, ''),
  DISCORD_CLIENT_SECRET: Joi.string().allow(null, ''),
  CLIENT_URL: Joi.string().uri().allow(null, '').required(),
  SERVER_API_URL: Joi.string().uri().allow(null, '').required(),
  DISCORD_SERVER_URL: Joi.string().uri().allow(null, '').required(),
  SESSION_SECRET: Joi.string().allow(null, ''),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown();

const { error, value: env } = envSchema.validate(process.env, {
  convert: true,
});

if (error) {
  console.warn('[config] Environment validation warning:', error.message);
}

const STRONG_SESSION_SECRET_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{20,}$/;

/**
 * Résout le secret de signature des cookies de session Express.
 * En production, exige au moins 20 caractères avec minuscule, majuscule et chiffre.
 */
function resolveSessionSecret(sessionSecret, nodeEnv) {
  const trimmed = typeof sessionSecret === 'string' ? sessionSecret.trim() : '';
  if (nodeEnv === 'production') {
    if (!STRONG_SESSION_SECRET_RE.test(trimmed)) {
      throw new Error(
        '[config] SESSION_SECRET must be at least 20 chars with uppercase, lowercase and digits in production. Generate one with: openssl rand -base64 32',
      );
    }
    return trimmed;
  }
  return trimmed || 'dev_secret_shhh';
}

const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  SESSION_SECRET: env.SESSION_SECRET || null,
  sessionSecret: env.SESSION_SECRET || null,
  bnet: {
    id: env.BNET_ID || null,
    secret: env.BNET_SECRET || null,
  },
  discord: {
    enabled: env.ENABLE_DISCORD_BOT === 'true' || env.ENABLE_DISCORD_BOT === true,
    token: env.DISCORD_BOT_TOKEN || null,
    url: env.DISCORD_SERVER_URL || null,
    clientId: env.DISCORD_CLIENT_ID || null,
    clientSecret: env.DISCORD_CLIENT_SECRET || null,
  },
  urls: {
    client: env.CLIENT_URL || null,
    server: env.SERVER_API_URL || null,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  initData: env.INIT_DATA_ON_START === '1' || env.INIT_DATA_ON_START === 'true',
  resolveSessionSecret,
};

module.exports = config;
