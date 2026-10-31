module.exports = (client) => {
  client.once('clientReady', async () => {
    const botTag = client.user && client.user.tag ? client.user.tag : 'discord-bot';
    console.log(`✅ [Discord] Bot connected as ${botTag}`);

    const guildsData = [];
    for (const guild of client.guilds.cache.values()) {
      await guild.members
        .fetch()
        .catch((err) => console.error(`Failed to fetch members for guild ${guild.id}`, err));

      const members = guild.members.cache;
      const channels = guild.channels.cache.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }));

      const data = {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        channels,
        members: members.map((member) => ({ id: member.id, tag: member.user.tag })),
      };

      guildsData.push(data);

      console.log(
        `✅ [Discord] Guild loaded: ${guild.name} (${guild.memberCount} members, ${channels.length} channels)`,
      );
    }

    client.guildsData = guildsData;
  });
};
