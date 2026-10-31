import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';

/**
 * Skips sources that are already loaded.
 * @param {import('discord.js').Client} client
 */
async function ensureEmojisCached(client) {
  for (const guild of client.guilds.cache.values()) {
    if (guild.emojis.cache.size === 0) {
      await guild.emojis
        .fetch()
        .catch((err) =>
          console.error(
            `[Raid Controller] Failed to fetch emojis for "${guild.name}":`,
            err.message,
          ),
        );
    }
  }

  if (client.application?.emojis && client.application.emojis.cache.size === 0) {
    await client.application.emojis.fetch().catch(() => null);
  }
}

/**
 * Call this AFTER ensureEmojisCached().
 * @param {import('discord.js').Client} client
 * @returns {Map<string, import('discord.js').GuildEmoji>}
 */
function buildEmojiMap(client) {
  const map = new Map();

  client.guilds.cache.forEach((guild) => {
    guild.emojis.cache.forEach((emoji) => {
      if (emoji.name) map.set(emoji.name.toLowerCase(), emoji);
    });
  });

  client.application?.emojis?.cache?.forEach((emoji) => {
    if (emoji.name) map.set(emoji.name.toLowerCase(), emoji);
  });

  return map;
}

const CLASS_UNICODE_FALLBACK = {
  warrior: '⚔️',
  paladin: '🛡️',
  hunter: '🏹',
  rogue: '🗡️',
  priest: '✨',
  shaman: '⚡',
  mage: '🔥',
  warlock: '🌑',
  monk: '🥋',
  druid: '🌿',
  death_knight: '💀',
  demon_hunter: '👿',
  evoker: '🐉',
};

const DISCORD_FIELD_CHAR_LIMIT = 1024;
const TRUNCATION_RESERVE = 12;

/**
 * Entries are `{ name, class, lateTime? }` objects (or legacy strings).
 * @param {{ name: string, class?: string, lateTime?: string } | string} item
 * @param {Map<string, import('discord.js').GuildEmoji>} emojiMap
 * @returns {string}
 */
function formatEntry(item, emojiMap) {
  if (typeof item === 'string') return item;

  const key = String(item.class ?? '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();
  const emoji = key ? emojiMap.get(key) : null;

  if (key && !emoji) {
    console.warn(`[Raid Controller] No emoji for class: "${key}"`);
  }

  const fallback = key ? (CLASS_UNICODE_FALLBACK[key] ?? null) : null;
  const base = emoji ? `${emoji} ${item.name}` : fallback ? `${fallback} ${item.name}` : item.name;
  return item.lateTime ? `${base} (${item.lateTime})` : base;
}

/**
 * Format a list as a compact comma-separated string (for absent, late, noStatus).
 * Much more space-efficient than vertical format for large lists.
 */
function formatListCompact(list, emojiMap) {
  if (!list || list.length === 0) return '*Vide*';

  const limit = DISCORD_FIELD_CHAR_LIMIT - TRUNCATION_RESERVE;
  let value = '';
  let truncated = 0;

  for (let i = 0; i < list.length; i++) {
    const entry = formatEntry(list[i], emojiMap);
    const addition = value.length === 0 ? entry : `, ${entry}`;
    if (value.length + addition.length > limit) {
      truncated = list.length - i;
      break;
    }
    value += addition;
  }

  if (truncated > 0) value += ` *+${truncated}*`;
  return value;
}

/**
 * This is a pure function — all data and emojis are passed in.
 *
 * Layout:
 *   • Description   → event info + quick stats overview
 *   • Present       → vertical list per role (primary info, deserves space)
 *   • Absent/Late   → compact inline (secondary info)
 *   • Sans statut   → compact inline per role (many players, save space)
 *
 * @param {{ title: string, date: string, description: string, roster: Object, eventId: number }} data
 * @param {Map<string, import('discord.js').GuildEmoji>} emojiMap
 * @returns {EmbedBuilder}
 */
function buildRosterEmbed(data, emojiMap) {
  const { title, date, description, roster, eventId } = data;

  const fmtCompact = (list) => formatListCompact(list, emojiMap);

  const tanks = roster.tanks ?? [];
  const healers = roster.healers ?? [];
  const melee = roster.melee ?? [];
  const ranged = roster.ranged ?? [];
  const guests = roster.guests ?? [];
  const absentList = roster.absent ?? [];
  const lateList = roster.late ?? [];
  const noStatusList =
    roster.noStatus?.length > 0
      ? roster.noStatus
      : [
          ...(roster.noStatusTanks ?? []),
          ...(roster.noStatusHealers ?? []),
          ...(roster.noStatusMelee ?? []),
          ...(roster.noStatusRanged ?? []),
        ];

  const descriptionBlock = description ? `${description}\n\u200B` : ' ';

  const embed = new EmbedBuilder()
    .setColor('#C99A2E')
    .setTitle(title)
    .setDescription(descriptionBlock || ' ')
    .setTimestamp()
    .setFooter({ text: `ID: ${eventId}  •  Utilisez les boutons ci-dessous pour vous inscrire` });

  if (date) {
    embed.setAuthor({ name: `📅 ${date}` });
  }

  embed.addFields(
    { name: `🛡️ Tank (${tanks.length})`, value: fmtCompact(tanks), inline: true },
    { name: `➕ Heal (${healers.length})`, value: fmtCompact(healers), inline: true },
    { name: '\u200B', value: '\u200B', inline: true },
    { name: `⚔️ Melee (${melee.length})`, value: fmtCompact(melee), inline: true },
    { name: `🏹 Ranged (${ranged.length})`, value: fmtCompact(ranged), inline: true },
    { name: '\u200B', value: '\u200B', inline: true },
    { name: `👥 Invités (${guests.length})`, value: fmtCompact(guests), inline: false },
    { name: `❌ Absents (${absentList.length})`, value: fmtCompact(absentList), inline: false },
    { name: `⏳ En retard (${lateList.length})`, value: fmtCompact(lateList), inline: false },
    {
      name: `🤔 Sans réponse (${noStatusList.length})`,
      value: fmtCompact(noStatusList),
      inline: false,
    },
  );

  return embed;
}

/**
 * @param {number} eventId
 * @returns {ActionRowBuilder}
 */
function buildActionRow(eventId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`signup_accepted_${eventId}`)
      .setLabel('Présent')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`signup_declined_${eventId}`)
      .setLabel('Absent')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`signup_late_${eventId}`)
      .setLabel('En retard')
      .setEmoji('⏳')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`signup_invite_${eventId}`)
      .setLabel('Inviter')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ping_noresp_${eventId}`)
      .setLabel('Rappel inscription')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Resolve the Discord client or reject the request early.
 * @param {import('express').Response} res
 * @returns {import('discord.js').Client | null}
 */
function getReadyClient(res) {
  const client = global.discordClient;
  if (!client?.user) {
    res.status(503).json({ error: 'discord_bot_not_ready' });
    return null;
  }
  return client;
}

export async function createRaidChannel(req, res, next) {
  try {
    const client = getReadyClient(res);
    if (!client) return;

    const {
      eventId,
      title,
      channelName: providedChannelName,
      date,
      description,
      categoryId,
      discordGuildId,
      roster,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: 'title_and_date_required' });
    }

    console.log(`[Raid Controller] Creating raid channel for event ${eventId}: "${title}"`);

    const guild = discordGuildId
      ? await client.guilds.fetch(discordGuildId).catch(() => null)
      : null;
    const targetGuild = guild ?? client.guilds.cache.first();

    if (!targetGuild) {
      return res.status(500).json({ error: 'no_guild_found' });
    }

    const channelName =
      providedChannelName || `raid-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const channel = await targetGuild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId || process.env.DISCORD_RAID_CATEGORY_ID,
      topic: `Gestion du raid ID: ${eventId}`,
    });

    await ensureEmojisCached(client);
    const emojiMap = buildEmojiMap(client);

    const initialRoster = roster ?? {
      tanks: [],
      healers: [],
      melee: [],
      ranged: [],
      absent: [],
      late: [],
      noStatus: [],
      noStatusTanks: [],
      noStatusHealers: [],
      noStatusMelee: [],
      noStatusRanged: [],
    };

    const embed = buildRosterEmbed(
      { title, date, description, roster: initialRoster, eventId },
      emojiMap,
    );
    const row = buildActionRow(eventId);

    const message = await channel.send({ embeds: [embed], components: [row] });

    console.log(`[Raid Controller] Channel created: ${channel.id}, message: ${message.id}`);
    res.json({ channelId: channel.id, messageId: message.id, url: message.url });
  } catch (err) {
    console.error('[Raid Controller] Error creating raid channel:', err);
    next(err);
  }
}

export async function deleteRaidChannel(req, res, next) {
  try {
    const client = getReadyClient(res);
    if (!client) return;

    const { channelId } = req.params;
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return res.status(404).json({ error: 'channel_not_found' });
    }

    await channel.delete('Raid event deleted');
    console.log(`[Raid Controller] Channel ${channelId} deleted.`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Raid Controller] Error deleting raid channel:', err);
    next(err);
  }
}

export async function updateRosterMessage(req, res, next) {
  try {
    const client = getReadyClient(res);
    if (!client) return;

    const { channelId, messageId, roster, eventId, title, date, description } = req.body;

    console.log(
      `[Raid Controller] Updating roster for event ${eventId} (channel: ${channelId}, message: ${messageId})`,
    );

    const channel = await client.channels.fetch(channelId).catch((err) => {
      console.error(`[Raid Controller] Failed to fetch channel ${channelId}:`, err.message);
      return null;
    });
    if (!channel) return res.status(404).json({ error: 'channel_not_found' });

    const message = await channel.messages.fetch(messageId).catch((err) => {
      console.error(`[Raid Controller] Failed to fetch message ${messageId}:`, err.message);
      return null;
    });
    if (!message) return res.status(404).json({ error: 'message_not_found' });

    await ensureEmojisCached(client);
    const emojiMap = buildEmojiMap(client);

    const embed = buildRosterEmbed({ title, date, description, roster, eventId }, emojiMap);
    const row = buildActionRow(eventId);

    await message.edit({ embeds: [embed], components: [row] });
    console.log(`[Raid Controller] Successfully updated message ${messageId}`);

    res.json({ ok: true });
  } catch (err) {
    console.error('[Raid Controller] Error updating raid roster:', err);
    next(err);
  }
}

/**
 * Resolve a list of `{ name, discordTag }` players to Discord member mentions
 * inside a guild, then post a single ping message in `channel`.
 * Returns `{ mentioned, unresolved }` so callers can build their own UX.
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').TextBasedChannel} channel
 * @param {Array<{ name: string, discordTag: string }>} players
 * @param {string} [headline]
 */
export async function pingNoResponders(guild, channel, players, headline) {
  const { mentions, unresolved } = await resolveMentions(guild, players);

  if (mentions.length === 0) {
    return { mentioned: [], unresolved };
  }

  const suffix = unresolved.length > 0 ? `\n*(non résolus : ${unresolved.join(', ')})*` : '';
  const text = headline || '📢 **Merci de répondre au raid svp !**';
  await channel.send({ content: `${text}\n${mentions.join(' ')}${suffix}` });

  return { mentioned: mentions, unresolved };
}

/**
 * @param {import('discord.js').Guild} guild
 * @param {Array<{ name: string, discordTag: string }>} players
 * @returns {Promise<{ mentions: string[], unresolved: string[] }>}
 */
async function resolveMentions(guild, players) {
  const mentions = [];
  const unresolved = [];

  for (const player of players) {
    const tag = player.discordTag.startsWith('@') ? player.discordTag.slice(1) : player.discordTag;
    try {
      const members = await guild.members.fetch({ query: tag, limit: 1 });
      const member = members.first();
      if (member) {
        mentions.push(`<@${member.id}>`);
      } else {
        unresolved.push(player.name);
      }
    } catch (err) {
      console.warn(`[Raid Controller] Failed to resolve "${tag}":`, err.message);
      unresolved.push(player.name);
    }
  }

  return { mentions, unresolved };
}

/**
 * PUT /api/discord/raid/ping-no-responders
 * Body: { guildId, channelId, players: [{ name, discordTag }], headline? }
 *
 * Used by the server cron to trigger the same action as the
 * "Rappel inscription" button without an interaction context.
 */
export async function pingNoRespondersEndpoint(req, res, next) {
  try {
    const client = getReadyClient(res);
    if (!client) return;

    const { guildId, channelId, players, headline } = req.body;
    if (!guildId || !channelId || !Array.isArray(players)) {
      return res.status(400).json({ error: 'guildId_channelId_players_required' });
    }

    if (players.length === 0) {
      return res.json({ ok: true, mentioned: 0, unresolved: [] });
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'guild_not_found' });

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased?.()) return res.status(404).json({ error: 'channel_not_found' });

    const result = await pingNoResponders(guild, channel, players, headline);
    res.json({ ok: true, mentioned: result.mentioned.length, unresolved: result.unresolved });
  } catch (err) {
    console.error('[Raid Controller] Error pinging non-responders:', err);
    next(err);
  }
}

/**
 * Build the composition embed of the second raid reminder:
 * starters per role, then tentative signups.
 * @param {{ tanks?: Array, healers?: Array, melee?: Array, ranged?: Array }} composition
 * @param {Array} tentative
 * @param {Map<string, import('discord.js').GuildEmoji>} emojiMap
 * @returns {EmbedBuilder}
 */
function buildCompositionEmbed(composition, tentative, emojiMap) {
  const fmt = (list) => formatListCompact(list, emojiMap);
  const tanks = composition.tanks ?? [];
  const healers = composition.healers ?? [];
  const melee = composition.melee ?? [];
  const ranged = composition.ranged ?? [];
  const total = tanks.length + healers.length + melee.length + ranged.length;

  return new EmbedBuilder()
    .setColor('#C99A2E')
    .setTitle(`📋 Composition (${total} titulaires)`)
    .addFields(
      { name: `🛡️ Tank (${tanks.length})`, value: fmt(tanks), inline: true },
      { name: `➕ Heal (${healers.length})`, value: fmt(healers), inline: true },
      { name: '​', value: '​', inline: true },
      { name: `⚔️ Melee (${melee.length})`, value: fmt(melee), inline: true },
      { name: `🏹 Ranged (${ranged.length})`, value: fmt(ranged), inline: true },
      { name: '​', value: '​', inline: true },
      { name: `🤔 À confirmer (${tentative.length})`, value: fmt(tentative), inline: false },
    )
    .setTimestamp();
}

/**
 * PUT /api/discord/raid/confirm-reminder
 * Body: { guildId, channelId, headline, composition, tentative, players }
 *
 * Second raid reminder sent by the server cron shortly before the raid:
 * announces the composition and mentions starters and tentative signups.
 */
export async function confirmReminderEndpoint(req, res, next) {
  try {
    const client = getReadyClient(res);
    if (!client) return;

    const { guildId, channelId, headline, composition, tentative, players } = req.body;
    if (!guildId || !channelId || !composition || !Array.isArray(players)) {
      return res.status(400).json({ error: 'guildId_channelId_composition_players_required' });
    }

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return res.status(404).json({ error: 'guild_not_found' });

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased?.() || channel.guildId !== guild.id) {
      return res.status(404).json({ error: 'channel_not_found' });
    }

    const { mentions, unresolved } = await resolveMentions(guild, players);

    await ensureEmojisCached(client);
    const embed = buildCompositionEmbed(
      composition,
      Array.isArray(tentative) ? tentative : [],
      buildEmojiMap(client),
    );

    const suffix = unresolved.length > 0 ? `\n*(non résolus : ${unresolved.join(', ')})*` : '';
    const text = headline || '⏰ **Le raid commence bientôt !**';
    const content = mentions.length > 0 ? `${text}\n${mentions.join(' ')}${suffix}` : text;
    await channel.send({ content, embeds: [embed] });

    res.json({ ok: true, mentioned: mentions.length, unresolved });
  } catch (err) {
    console.error('[Raid Controller] Error sending confirm reminder:', err);
    next(err);
  }
}
