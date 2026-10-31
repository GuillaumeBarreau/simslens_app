const client = require('./client');
const onClientReady = require('./actions/onClientReady');
const onMessageCreate = require('./actions/onMessageCreate');
const onInteractionCreate = require('./actions/onInteractionCreate');
const config = require('../../shared/config');

if (!config.discord.enabled) {
  console.log('⚠️  [Discord] Bot disabled (ENABLE_DISCORD_BOT not set to true)');
  module.exports = null;
}

if (!config.discord.token) {
  console.error('❌ [Discord] Bot token not configured (DISCORD_BOT_TOKEN missing)');
  module.exports = null;
}

console.log('🔄 [Discord] Initializing bot...');

onClientReady(client);
onMessageCreate(client);
onInteractionCreate(client);

client.login(config.discord.token).catch((err) => {
  console.error('❌ [Discord] Failed to connect:', err.message);
});

module.exports = client;
