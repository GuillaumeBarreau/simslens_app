import { REST } from '@discordjs/rest';
import { ActivityType, Events } from 'discord.js';
import { Routes } from 'discord-api-types/v10';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const rest = new REST({ version: '10' }).setToken(client.token);

    client.user.presence.set({
      activities: [{ name: 'Developed by memte.', type: ActivityType.Listening }],
    });

    client.logger.info(`${client.user.username} Active!`);

    try {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: client.slashDatas,
      });
    } catch (error) {
      console.error(error);
    }

    if (client.application?.emojis) {
      await client.application.emojis
        .fetch()
        .then((emojis) => client.logger.info(`Loaded ${emojis.size} application emojis`))
        .catch((err) => console.error('Failed to fetch application emojis:', err));
    }

    const guildsData = [];
    for (const guild of client.guilds.cache.values()) {
      await guild.members
        .fetch()
        .catch((err) => console.error(`Failed to fetch members for guild ${guild.id}`, err));

      await guild.emojis
        .fetch()
        .then((emojis) =>
          client.logger.info(`Loaded ${emojis.size} emojis for guild ${guild.name}`),
        )
        .catch((err) => console.error(`Failed to fetch emojis for guild ${guild.id}`, err));

      const members = guild.members.cache;
      const channels = guild.channels.cache.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
      }));

      guildsData.push({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        channels,
        members: members.map((member) => ({ id: member.id, tag: member.user.tag })),
      });

      client.logger.info(
        `Guild loaded: ${guild.name} — ${guild.memberCount} members, ${channels.length} channels, Guild ID: ${guild.id}`,
      );
    }

    client.guildsData = guildsData;
  },
};
