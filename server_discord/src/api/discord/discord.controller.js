export async function sendMessage(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { content, channelId, dmUserId, dmLastActive, instanceId, bossId, embeds, components } =
      req.body || {};

    let messageContent = content;
    if (!messageContent && instanceId && bossId) {
      messageContent = `⚔️ Boss ${bossId} tué (instance ${instanceId})`;
    }

    if (!messageContent && !embeds) {
      return res.status(400).json({ error: 'content_or_embeds_required' });
    }

    const payload = {
      ...(messageContent && { content: messageContent }),
      ...(embeds && { embeds }),
      ...(components && { components }),
    };

    if (dmUserId || dmLastActive) {
      const user = await resolveUser(client, dmUserId, dmLastActive);
      if (user) {
        try {
          const dm = await user.send(payload);
          return res.json({ ok: true, dm: true, to: user.id, messageId: dm.id });
        } catch (err) {
          // Fallthrough to channel
        }
      }
    }

    const targetChannelId =
      channelId || process.env.DISCORD_CHANNEL_ID || client._lastSeenChannelId;
    if (!targetChannelId) return res.status(400).json({ error: 'no_channel_configured' });

    const channel = await client.channels.fetch(targetChannelId).catch(() => null);
    if (!channel?.send) return res.status(500).json({ error: 'discord_channel_not_available' });

    const sent = await channel.send(payload);
    res.json({ ok: true, messageId: sent.id, content: sent.content });
  } catch (err) {
    next(err);
  }
}

export async function status(req, res, next) {
  try {
    const client = global.discordClient;
    res.json({
      ready: !!client?.user,
      lastSeenChannelId: client?._lastSeenChannelId,
      lastSeenUserId: client?._lastSeenUserId,
    });
  } catch (err) {
    next(err);
  }
}

export async function members(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { guildId } = req.query || {};
    const guildsData = client.guildsData || [];

    if (!guildsData.length) return res.status(204).json({ guilds: [] });

    const payload = guildId ? guildsData.filter((g) => g.id === guildId) : guildsData;
    res.json({ guilds: payload });
  } catch (err) {
    next(err);
  }
}

async function resolveUser(client, dmUserId, dmLastActive) {
  if (dmUserId) {
    if (/^\d{17,19}$/.test(dmUserId)) {
      try {
        return await client.users.fetch(dmUserId);
      } catch {
        /* ignore */
      }
    }

    for (const guild of client.guilds.cache.values()) {
      try {
        let member = guild.members.cache.find(
          (m) => m.user.tag === dmUserId || m.user.username === dmUserId,
        );
        if (!member) {
          const members = await guild.members.search({ query: dmUserId, limit: 1 });
          member = members.find((m) => m.user.tag === dmUserId || m.user.username === dmUserId);
        }
        if (member) return member.user;
      } catch {
        /* ignore */
      }
    }
  }

  if (dmLastActive && client._lastSeenUserId) {
    try {
      return await client.users.fetch(client._lastSeenUserId);
    } catch {
      /* ignore */
    }
  }

  return null;
}

export async function createEvent(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { name, description, scheduledStartTime, scheduledEndTime, entityType, entityMetadata } =
      req.body || {};

    if (!name || !scheduledStartTime) {
      return res.status(400).json({ error: 'name_and_scheduledStartTime_required' });
    }

    const guild = client.guilds.cache.first();
    if (!guild) {
      return res.status(500).json({ error: 'no_guild_found' });
    }

    const event = await guild.scheduledEvents.create({
      name,
      description: description || '',
      scheduledStartTime: new Date(scheduledStartTime),
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
      privacyLevel: 2, // GUILD_ONLY
      entityType: entityType || 3, // EXTERNAL
      entityMetadata: entityMetadata || { location: 'World of Warcraft' },
    });

    res.json({ id: event.id, name: event.name, url: event.url });
  } catch (err) {
    console.error('Error creating Discord event:', err);
    next(err);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { id } = req.params;
    const { name, description, scheduledStartTime, scheduledEndTime, status } = req.body || {};

    const guild = client.guilds.cache.first();
    if (!guild) {
      return res.status(500).json({ error: 'no_guild_found' });
    }

    const event = await guild.scheduledEvents.fetch(id).catch(() => null);
    if (!event) {
      return res.status(404).json({ error: 'event_not_found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (scheduledStartTime) updateData.scheduledStartTime = new Date(scheduledStartTime);
    if (scheduledEndTime) updateData.scheduledEndTime = new Date(scheduledEndTime);
    if (status) updateData.status = status;

    const updatedEvent = await event.edit(updateData);

    res.json({ id: updatedEvent.id, name: updatedEvent.name, url: updatedEvent.url });
  } catch (err) {
    console.error('Error updating Discord event:', err);
    next(err);
  }
}

export async function deleteEvent(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { id } = req.params;

    const guild = client.guilds.cache.first();
    if (!guild) {
      return res.status(500).json({ error: 'no_guild_found' });
    }

    const event = await guild.scheduledEvents.fetch(id).catch(() => null);
    if (!event) {
      return res.status(404).json({ error: 'event_not_found' });
    }

    await event.delete();

    res.json({ ok: true, message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Error deleting Discord event:', err);
    next(err);
  }
}

export async function postAnnouncement(req, res, next) {
  try {
    const client = global.discordClient;
    if (!client?.user) return res.status(503).json({ error: 'discord_bot_not_ready' });

    const { title, description, eventId } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ error: 'title_and_description_required' });
    }

    const channelId = process.env.DISCORD_ANNOUNCE_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      return res.status(400).json({ error: 'no_announce_channel_configured' });
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.send) {
      return res.status(500).json({ error: 'announce_channel_not_available' });
    }

    const embed = {
      color: 0x5865f2, // Discord blurple
      title,
      description,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Calendrier de Raids',
      },
    };

    if (eventId) {
      embed.fields = [
        {
          name: '🔗 Lien',
          value: `[Voir sur l'application](${process.env.CLIENT_URL}/calendar)`,
        },
      ];
    }

    const sent = await channel.send({ embeds: [embed] });

    res.json({ ok: true, messageId: sent.id });
  } catch (err) {
    console.error('Error posting announcement:', err);
    next(err);
  }
}
