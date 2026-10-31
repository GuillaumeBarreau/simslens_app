const EventEmitter = require('events');
const path = require('path');

class FakeDiscordClient extends EventEmitter {
  async sendMessage(channel, content) {
    if (channel && typeof channel.send === 'function') {
      return channel.send(content);
    }
    console.log('[discordMock] channel.send ->', content);
  }
}

const client = new FakeDiscordClient();

const useMock = process.env.ENABLE_DISCORD_MOCK !== 'false';
let onMessageCreate;
try {
  if (useMock) {
    onMessageCreate = require(path.join(__dirname, 'discord', 'actions', 'onMessageCreate.mock'));
  } else {
    onMessageCreate = require(path.join(__dirname, 'discord', 'actions', 'onMessageCreate'));
  }
} catch (e) {
  console.error('[discordMock] failed to load onMessageCreate handler', e && e.message);
}

if (typeof onMessageCreate === 'function') {
  onMessageCreate(client);
} else {
  console.warn(
    '[discordMock] onMessageCreate handler is not a function, mock will not emit message handling',
  );
}

module.exports = client;
