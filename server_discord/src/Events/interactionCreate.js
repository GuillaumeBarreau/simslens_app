import axios from 'axios';
import {
  ActionRowBuilder,
  Collection,
  Events,
  InteractionType,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const pendingGuestInvites = new Map();

import { pingNoResponders } from '../api/discord/raid.controller.js';
import config from '../Base/config.js';
const cooldown = new Collection();

const INTERACTION_MAX_AGE_MS = 1500;

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const { client } = interaction;

    const age = Date.now() - interaction.createdTimestamp;
    if (age > INTERACTION_MAX_AGE_MS) {
      console.warn(
        `[Interaction] Skipping stale interaction (${Math.round(age / 1000)}s old): ${interaction.customId || interaction.commandName || 'unknown'}`,
      );
      return;
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.user.bot) return;
      try {
        const command = client.slashCommands.get(interaction.commandName);
        if (command) {
          if (command.ownerOnly && !config.owners.includes(interaction.user.id)) {
            return interaction.reply({
              content: 'Only my **developers** can use this command.',
              ephemeral: true,
            });
          }

          if (command.cooldown) {
            if (cooldown.has(`${command.name}-${interaction.user.id}`)) {
              const nowDate = interaction.createdTimestamp;
              const waitedDate = cooldown.get(`${command.name}-${interaction.user.id}`) - nowDate;
              return interaction
                .reply({
                  content: `Cooldown is currently active, please try again <t:${Math.floor(new Date(nowDate + waitedDate).getTime() / 1000)}:R>.`,
                  ephemeral: true,
                })
                .then(() =>
                  setTimeout(
                    () => interaction.deleteReply(),
                    cooldown.get(`${command.name}-${interaction.user.id}`) - Date.now() + 1000,
                  ),
                );
            }

            command.slashRun(interaction);
            cooldown.set(`${command.name}-${interaction.user.id}`, Date.now() + command.cooldown);
            setTimeout(() => {
              cooldown.delete(`${command.name}-${interaction.user.id}`);
            }, command.cooldown + 1000);
          } else {
            command.slashRun(interaction);
          }
        }
      } catch (e) {
        console.error(e);
        interaction.reply({
          content: 'An error occurred while executing the command! Please try again.',
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('guest_modal_')) {
      return handleGuestModalSubmit(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('raid_signup_')) {
        await handleRaidSignup(interaction);
        return;
      }
      if (interaction.customId.startsWith('guest_role_')) {
        await handleGuestRoleSelect(interaction);
        return;
      }
      if (interaction.customId.startsWith('guest_class_')) {
        await handleGuestClassSelect(interaction);
        return;
      }
    }

    if (interaction.isButton()) {
      // The invite button must show a modal — cannot deferReply before showModal.
      if (interaction.customId.startsWith('signup_invite_')) {
        return handleGuestInviteButton(interaction);
      }

      if (!interaction.deferred && !interaction.replied) {
        try {
          await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        } catch (deferErr) {
          if (deferErr.code === 10062) {
            return;
          }
          if (deferErr.code === 40060) {
            // Already acknowledged (e.g. double event fire) — editReply still works, continue
          } else {
            console.error('[Interaction] deferReply failed unexpectedly:', deferErr.message);
            return;
          }
        }
      }

      try {
        const parts = interaction.customId.split('_');
        const prefix = parts[0];

        if (prefix === 'signup') {
          await handleRaidSignup(interaction);
          return;
        }

        if (prefix === 'ping' && parts[1] === 'noresp') {
          await handlePingNoResponders(interaction, parts[2]);
          return;
        }

        // Anciens boutons de vote encore présents dans des messages privés : le vote se
        // fait désormais dans l'addon en jeu (SIMS-149).
        if (prefix === 'vote') {
          await interaction.editReply({
            content: "Le vote de loot se fait désormais en jeu, dans l'addon de la guilde.",
          });
          return;
        }

        await interaction.editReply({ content: 'Interaction invalide ou inconnue.' });
      } catch (err) {
        console.error('Failed to handle Discord interaction:', err);
        try {
          await interaction.editReply({
            content: 'Une erreur est survenue en traitant votre requête.',
          });
        } catch (e) {
          console.error('Failed to send error reply:', e);
        }
      }
    }
  },
};

async function handleRaidSignup(interaction) {
  const { customId, user, values } = interaction;

  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
  }

  let eventId;
  let action;

  if (interaction.isButton()) {
    const parts = customId.split('_');
    if (parts.length < 3) return;

    eventId = parts[2];
    const statusType = parts[1];

    if (statusType === 'accepted') action = 'PRESENT';
    else if (statusType === 'declined') action = 'ABSENT';
    else if (statusType === 'late') action = 'LATE';
  } else {
    const parts = customId.split('_');
    if (parts.length < 3) return;
    eventId = parts[2];
    action = values[0];
  }

  const serverApiUrl = config.serverApiUrl || 'http://localhost:5000';

  try {
    let character = null;
    console.log(
      `[Interaction] Resolving character for Discord Tag: "${user.tag}" (ID: ${user.id})...`,
    );
    try {
      const resp = await axios.get(
        `${serverApiUrl}/1/character/discord/${encodeURIComponent(user.tag)}`,
        // Route réservée au bot (SIMS-153).
        { headers: { 'x-internal-token': config.token } },
      );
      character = resp.data;
      console.log(
        `[Interaction] Found character: ${character.name} (ID: ${character.id}, Realm: ${character.realmId})`,
      );
    } catch (e) {
      console.error(
        `[Interaction] Failed to resolve character for tag "${user.tag}":`,
        e.response?.data || e.message,
      );
      if (e.response && e.response.status === 404) {
        return interaction.editReply({
          content:
            "Impossible de trouver votre personnage lié. Assurez-vous d'avoir renseigné votre Discord Tag sur le Roster.",
          flags: [MessageFlags.Ephemeral],
        });
      }
      throw e;
    }

    let status = action;
    let lateTime = action === 'LATE' ? '21:15' : null;

    console.log(
      `[Interaction] Sending signup to server for event ${eventId}, status: ${status}...`,
    );
    let signupResp;
    try {
      signupResp = await axios.post(
        `${serverApiUrl}/1/events/${eventId}/signup`,
        {
          characterId: character.id,
          status,
          lateTime,
        },
        {
          params: { realmId: character.realmId },
          headers: {
            'x-internal-token': config.token,
            'x-acting-discord-tag': user.tag,
          },
        },
      );
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.message === 'signup_locked') {
        return interaction.editReply({
          content:
            '🔒 Les inscriptions de ce raid sont fermées. Contacte un administrateur si besoin.',
          flags: [MessageFlags.Ephemeral],
        });
      }
      throw err;
    }
    console.log(
      `[Interaction] Server signup response:`,
      signupResp.status === 200 || signupResp.status === 201 ? 'Success' : signupResp.status,
    );

    const actionLabels = {
      PRESENT: 'Présent',
      ABSENT: 'Absent',
      LATE: 'En retard',
      TENTATIVE: 'Incertain',
      BENCH: 'Remplaçant',
    };

    await interaction.editReply({
      content: `Inscription mise à jour : **${actionLabels[action] || action}** pour **${character.name}**`,
      flags: [MessageFlags.Ephemeral],
    });
  } catch (err) {
    console.error('Raid signup error:', err);
    await interaction.editReply({
      content: "Erreur lors de l'inscription. Vérifiez que le serveur est accessible.",
      flags: [MessageFlags.Ephemeral],
    });
  }
}

/**
 * Handle the "Inviter ➕" button click — shows a modal form.
 * Must NOT deferReply before showModal.
 */
async function handleGuestInviteButton(interaction) {
  const eventId = interaction.customId.split('_')[2];

  const modal = new ModalBuilder()
    .setCustomId(`guest_modal_${eventId}`)
    .setTitle('Ajouter un invité');

  const nameInput = new TextInputBuilder()
    .setCustomId('guest_name')
    .setLabel('Nom du joueur')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(50)
    .setPlaceholder('Ex: Ghostbane')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

  try {
    await interaction.showModal(modal);
  } catch (err) {
    if (err.code === 10062) {
      console.warn(
        '[Guest Invite] Interaction expired before showModal could be called (10062), skipping.',
      );
    } else {
      console.error('[Guest Invite] Failed to show modal:', err.message);
    }
  }
}

async function handleGuestModalSubmit(interaction) {
  const eventId = interaction.customId.split('_')[2];
  const name = interaction.fields.getTextInputValue('guest_name').trim();

  const key = `${interaction.user.id}_${eventId}`;
  pendingGuestInvites.set(key, { name, addedBy: interaction.user.tag });
  setTimeout(() => pendingGuestInvites.delete(key), 5 * 60 * 1000);

  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId(`guest_role_${eventId}`)
    .setPlaceholder('Choisir un rôle')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('🛡️ Tank').setValue('TANK'),
      new StringSelectMenuOptionBuilder().setLabel('➕ Healer').setValue('HEALER'),
      new StringSelectMenuOptionBuilder().setLabel('⚔️ Melee DPS').setValue('MELEE'),
      new StringSelectMenuOptionBuilder().setLabel('🏹 Ranged DPS').setValue('RANGED'),
    );

  await interaction.reply({
    content: `Quel rôle pour **${name}** ?`,
    components: [new ActionRowBuilder().addComponents(roleSelect)],
    flags: [MessageFlags.Ephemeral],
  });
}

async function handleGuestRoleSelect(interaction) {
  await interaction.deferUpdate();

  const eventId = interaction.customId.split('_')[2];
  const role = interaction.values[0];
  const key = `${interaction.user.id}_${eventId}`;
  const pending = pendingGuestInvites.get(key);

  if (!pending) {
    return interaction.editReply({
      content: '❌ Session expirée, recommence depuis le bouton Inviter.',
      components: [],
    });
  }

  pendingGuestInvites.set(key, { ...pending, role });

  const classSelect = new StringSelectMenuBuilder()
    .setCustomId(`guest_class_${eventId}`)
    .setPlaceholder('Choisir une classe')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('Guerrier').setValue('warrior').setEmoji('⚔️'),
      new StringSelectMenuOptionBuilder().setLabel('Paladin').setValue('paladin').setEmoji('🛡️'),
      new StringSelectMenuOptionBuilder().setLabel('Chasseur').setValue('hunter').setEmoji('🏹'),
      new StringSelectMenuOptionBuilder().setLabel('Voleur').setValue('rogue').setEmoji('🗡️'),
      new StringSelectMenuOptionBuilder().setLabel('Prêtre').setValue('priest').setEmoji('✨'),
      new StringSelectMenuOptionBuilder().setLabel('Chaman').setValue('shaman').setEmoji('⚡'),
      new StringSelectMenuOptionBuilder().setLabel('Mage').setValue('mage').setEmoji('🔥'),
      new StringSelectMenuOptionBuilder().setLabel('Démoniste').setValue('warlock').setEmoji('🌑'),
      new StringSelectMenuOptionBuilder().setLabel('Moine').setValue('monk').setEmoji('🥋'),
      new StringSelectMenuOptionBuilder().setLabel('Druide').setValue('druid').setEmoji('🌿'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Chevalier de la mort')
        .setValue('death_knight')
        .setEmoji('💀'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Chasseur de démons')
        .setValue('demon_hunter')
        .setEmoji('👿'),
      new StringSelectMenuOptionBuilder().setLabel('Évocateur').setValue('evoker').setEmoji('🐉'),
    );

  await interaction.editReply({
    content: `Quelle classe pour **${pending.name}** *(${role})* ?`,
    components: [new ActionRowBuilder().addComponents(classSelect)],
  });
}

/**
 * Handle the "Ping les troud'balles" button — admin-only, pings all non-responders.
 */
async function handlePingNoResponders(interaction, eventId) {
  const serverApiUrl = config.serverApiUrl || 'http://localhost:5000';

  let players;
  try {
    const resp = await axios.get(`${serverApiUrl}/1/events/${eventId}/no-status-tags`, {
      headers: {
        'x-internal-token': config.token,
        'x-acting-discord-tag': interaction.user.tag,
      },
    });
    players = resp.data.players || [];
  } catch (err) {
    if (err.response?.status === 403) {
      return interaction.editReply({
        content: '🚫 Seuls les admins/modérateurs du royaume peuvent utiliser ce bouton.',
      });
    }
    console.error(
      '[Ping NoResp] Failed to fetch no-status tags:',
      err.response?.data || err.message,
    );
    return interaction.editReply({
      content: '❌ Impossible de récupérer la liste des non-répondants.',
    });
  }

  if (players.length === 0) {
    return interaction.editReply({
      content: '✅ Tout le monde a répondu, personne à pinger.',
    });
  }

  const { guild, channel } = interaction;
  if (!guild || !channel) {
    return interaction.editReply({ content: '❌ Salon ou serveur introuvable.' });
  }

  const { mentioned } = await pingNoResponders(guild, channel, players);

  if (mentioned.length === 0) {
    return interaction.editReply({
      content: `❌ Aucun Discord trouvé pour les ${players.length} non-répondants.`,
    });
  }

  await interaction.editReply({
    content: `✅ ${mentioned.length} joueur(s) pingé(s).`,
  });
}

async function handleGuestClassSelect(interaction) {
  await interaction.deferUpdate();

  const eventId = interaction.customId.split('_')[2];
  const guestClass = interaction.values[0];
  const key = `${interaction.user.id}_${eventId}`;
  const pending = pendingGuestInvites.get(key);

  if (!pending) {
    return interaction.editReply({
      content: '❌ Session expirée, recommence depuis le bouton Inviter.',
      components: [],
    });
  }

  pendingGuestInvites.delete(key);
  const serverApiUrl = config.serverApiUrl || 'http://localhost:5000';

  try {
    await axios.post(
      `${serverApiUrl}/1/events/${eventId}/guests`,
      { name: pending.name, role: pending.role, class: guestClass, addedBy: pending.addedBy },
      { headers: { 'x-internal-token': config.token } },
    );

    await interaction.editReply({
      content: `✅ **${pending.name}** ajouté comme invité *(${pending.role} — ${guestClass})*.`,
      components: [],
    });
  } catch (err) {
    console.error('[Guest Class] Error adding guest:', err.response?.data || err.message);
    await interaction.editReply({
      content: "❌ Erreur lors de l'ajout de l'invité. Vérifiez que le serveur est accessible.",
      components: [],
    });
  }
}
