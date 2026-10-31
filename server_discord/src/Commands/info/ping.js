import { SlashCommandBuilder } from '@discordjs/builders';

export const commandBase = {
  prefixData: {
    name: 'ping',
    aliases: ['pong'],
  },
  slashData: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
  cooldown: 5000, // 1 second = 1000 ms / set to 0 if you don't want a cooldown.
  ownerOnly: false, // Set to true if you want the command to be usable only by the developer.
  async prefixRun(message) {
    message.reply('Pong 🏓');
  },
  async slashRun(interaction) {
    interaction.reply('Pong 🏓');
  },
};
