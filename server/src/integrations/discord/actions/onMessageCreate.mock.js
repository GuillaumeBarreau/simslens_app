module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    try {
      if (message && message.channel && message.channel.id)
        client._lastSeenChannelId = message.channel.id;
      if (message && message.author && message.author.id)
        client._lastSeenUserId = message.author.id;
    } catch (e) {
      console.error('[onMessageCreate.mock] error updating last seen channel/user', e);
    }
    try {
      const content = message.content || '';

      if (content.trim() === '!ping') {
        await message.channel.send('Pong (mock)');
        return;
      }

      const raidbotsRegex = /https:\/\/www\.raidbots\.com\/simbot\/report\/([a-zA-Z0-9]+)/g;
      const matches = Array.from(content.matchAll(raidbotsRegex));
      if (matches.length > 0) {
        for (const m of matches) {
          const reportID = m[1];
          await message.channel.send(`(mock) Début du traitement du rapport ${reportID}...`);

          setTimeout(() => {
            message.channel.send(`(mock) Traitement en cours pour ${reportID} (50%)`);
          }, 500);

          setTimeout(() => {
            message.channel.send(`(mock) Traitement terminé pour ${reportID}. Résultat: OK`);
            if (typeof message.react === 'function') {
              message.react('✅');
            }
          }, 1200);
        }
        return;
      }

      await message.channel.send(`(mock) reçu: ${content}`);
    } catch (err) {
      console.error('[onMessageCreate.mock] error', err);
    }
  });
};
