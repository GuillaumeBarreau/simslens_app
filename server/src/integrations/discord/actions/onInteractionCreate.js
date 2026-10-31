const characterRepository = require('../../../api/character/character.repository');
const signupService = require('../../../api/signup/signup.service');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    try {
      const parts = interaction.customId.split('_');
      const prefix = parts[0];

      // Le vote de loot se fait dans l'addon en jeu (SIMS-149) : seules les inscriptions.
      if (prefix === 'signup') {
        await handleSignupInteraction(interaction, parts);
      }
    } catch (err) {
      console.error('Failed to handle Discord interaction:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'Une erreur est survenue en traitant votre requête.',
          ephemeral: true,
        });
      }
    }
  });

  async function handleSignupInteraction(interaction, parts) {
    const [_, statusType, eventIdRaw] = parts;
    const eventId = parseInt(eventIdRaw, 10);

    await interaction.deferReply({ ephemeral: true });

    console.log(
      `[Discord Signup] user.tag="${interaction.user.tag}" user.username="${interaction.user.username}" user.id="${interaction.user.id}"`,
    );
    const character = await characterRepository.findCharacterByDiscordTag(interaction.user.tag);
    if (!character) {
      console.log(`[Discord Signup] No character found for tag="${interaction.user.tag}"`);
      return interaction.editReply({
        content:
          'Impossible de trouver votre personnage (discordTag absent). Ajoutez votre tag sur la plateforme.',
      });
    }

    let status = 'PRESENT';
    if (statusType === 'declined') status = 'ABSENT';
    if (statusType === 'late') status = 'LATE';

    await signupService.createOrUpdateSignup(
      {
        eventId,
        characterId: character.id,
        status,
        lateTime: status === 'LATE' ? '21:15' : null,
      },
      character,
      character.realmId,
    );

    const labels = {
      accepted: 'Présent',
      declined: 'Absent',
      late: 'En retard',
    };

    await interaction.editReply({
      content: `Votre inscription en tant que **${labels[statusType] || status}** a été enregistrée pour **${character.name}**.`,
    });
  }
};
