const eventRepository = require('./event.repository');
const absenceRepository = require('../absence/absence.repository');
const signupRepository = require('../signup/signup.repository');
const characterRepository = require('../character/character.repository');
const realmRepository = require('../realm/realm.repository');
const { prisma } = require('../../data');
const axios = require('axios');
const config = require('../../shared/config');
const { AppError } = require('../../shared/errors/AppError');
const { resolveRole, resolveSignupRole } = require('../../shared/constants/roles');
const { formatChannelName, formatEventDate, formatEventTitle } = require('./event.discordFormat');

const ADMIN_ROLES = new Set(['owner', 'admin', 'moderator']);

function getDiscordServerUrl() {
  const url = config.discord.url;
  if (!url) {
    throw new Error('DISCORD_SERVER_URL not configured');
  }
  return url;
}

/**
 * @param {Object} event - Event object
 * @param {string} action - Action type: 'create', 'update', 'delete'
 * @returns {Promise<Object|null>} Discord event/channel IDs or null
 */
async function syncToDiscord(event, action) {
  try {
    const discordServerUrl = getDiscordServerUrl();

    if (action === 'create') {
      const title = formatEventTitle(event);
      const { dateStr, startTime } = formatEventDate(event);

      console.log('[Event Service] Creating Discord Raid Channel...');
      const response = await axios.post(`${discordServerUrl}/api/discord/raid/channel`, {
        eventId: event.id,
        title,
        channelName: formatChannelName(event),
        date: dateStr,
        description: `**${event.title}**\n🕐 ${startTime}\n\n${event.description || ''}`,
        discordGuildId: event.realm?.discordGuildId,
        categoryId: event.realm?.discordRaidCategoryId,
      });

      const { channelId, messageId } = response.data;
      console.log(`[Event Service] Raid channel created: ${channelId}, message: ${messageId}`);

      try {
        await axios.post(`${discordServerUrl}/api/discord/announce`, {
          title: `📅 Nouveau Raid Planifié`,
          description: `**${event.title}**\n\n${title}\n🕐 ${startTime}\n\n[S'inscrire via Discord](https://discord.com/channels/${event.realmId}/${channelId})`,
          eventId: event.id,
        });
      } catch (announceErr) {
        console.warn(
          '[Event Service] Announce skipped (channel may not be configured):',
          announceErr.response?.data?.error || announceErr.message,
        );
      }

      return { discordChannelId: channelId, discordMessageId: messageId };
    } else if (action === 'update' && event.discordChannelId && event.discordMessageId) {
      await syncRosterToDiscord(event.id);
      return null;
    } else if (action === 'delete' && event.discordChannelId) {
      await axios.delete(`${discordServerUrl}/api/discord/raid/channel/${event.discordChannelId}`);
      console.log(`[Event Service] Discord channel ${event.discordChannelId} deleted.`);
      return null;
    }

    return null;
  } catch (error) {
    console.error(
      'Discord sync error:',
      error && error.response ? error.response.data : error.message,
    );
    return null;
  }
}

/**
 * @param {number} eventId
 */
async function syncRosterToDiscord(eventId) {
  try {
    console.log(`[Event Service] Syncing roster to Discord for event ${eventId}...`);
    const event = await eventRepository.findById(eventId);
    if (!event || !event.discordChannelId || !event.discordMessageId) {
      console.log(`[Event Service] Skipping sync: event not found or no Discord IDs`, {
        id: event?.id,
        channel: event?.discordChannelId,
        message: event?.discordMessageId,
      });
      return;
    }

    const discordServerUrl = getDiscordServerUrl();

    const roster = {
      tanks: [],
      healers: [],
      melee: [],
      ranged: [],
      late: [],
      absent: [],
      noStatus: [],
      noStatusTanks: [],
      noStatusHealers: [],
      noStatusMelee: [],
      noStatusRanged: [],
    };

    const signedUpCharacterIds = new Set();

    if (event.signups) {
      console.log(`[Event Service] Processing ${event.signups.length} signups...`);
      for (const signup of event.signups) {
        signedUpCharacterIds.add(signup.characterId);
        const charName = signup.character?.name || 'Unknown';
        const charClass = signup.character?.class || null;

        if (signup.status === 'ABSENT') {
          roster.absent.push({ name: charName, class: charClass });
        } else if (signup.status === 'LATE') {
          roster.late.push({ name: charName, class: charClass, lateTime: signup.lateTime || '?' });
        } else {
          const role = resolveSignupRole(signup.role, {
            class: charClass,
            specialization: {
              name: signup.character?.specialization?.name || signup.character?.spec || null,
              role: signup.character?.specialization?.role || null,
            },
          });

          const entry = { name: charName, class: charClass };

          if (role === 'TANK') {
            roster.tanks.push(entry);
          } else if (role === 'HEALER') {
            roster.healers.push(entry);
          } else if (role === 'MELEE') {
            roster.melee.push(entry);
          } else {
            roster.ranged.push(entry);
          }
        }
      }
    }

    try {
      const allActiveCharacters = await prisma.characters.findMany({
        where: {
          realmId: event.realmId,
          archived: 0,
          status: { not: 'pending' },
        },
        select: {
          id: true,
          name: true,
          class: true,
          specialization: { select: { name: true, role: true } },
        },
      });

      console.log(
        `[Event Service] Found ${allActiveCharacters.length} total active characters for realm ${event.realmId}`,
      );

      for (const char of allActiveCharacters) {
        if (!signedUpCharacterIds.has(char.id)) {
          const entry = { name: char.name, class: char.class || null };
          roster.noStatus.push(entry);
          const role = resolveRole(
            char.class,
            char.specialization?.name,
            char.specialization?.role,
          );

          if (role === 'TANK') {
            roster.noStatusTanks.push(entry);
          } else if (role === 'HEALER') {
            roster.noStatusHealers.push(entry);
          } else if (role === 'MELEE') {
            roster.noStatusMelee.push(entry);
          } else {
            roster.noStatusRanged.push(entry);
          }
        }
      }

      console.log(`[Event Service] Final roster summary:`, {
        present:
          roster.tanks.length + roster.healers.length + roster.melee.length + roster.ranged.length,
        noStatus: roster.noStatus.length,
        noStatusByRole: {
          tanks: roster.noStatusTanks.length,
          healers: roster.noStatusHealers.length,
          melee: roster.noStatusMelee.length,
          ranged: roster.noStatusRanged.length,
        },
        absent: roster.absent.length,
        late: roster.late.length,
      });
    } catch (err) {
      console.error('[Event Service] Error fetching active characters for noStatus:', err.message);
    }

    try {
      const guestRecords = await prisma.raid_guests.findMany({ where: { eventId } });
      roster.guests = guestRecords.map((g) => ({
        name: g.name,
        role: g.role,
        class: g.class || null,
      }));
    } catch (err) {
      console.error('[Event Service] Could not fetch guests:', err.message);
      roster.guests = [];
    }

    const title = formatEventTitle(event);
    const { dateStr, startTime } = formatEventDate(event);

    console.log(
      `[Event Service] Sending PUT request to bot: ${discordServerUrl}/api/discord/raid/roster`,
    );

    await axios.put(`${discordServerUrl}/api/discord/raid/roster`, {
      channelId: event.discordChannelId,
      messageId: event.discordMessageId,
      roster,
      eventId: event.id,
      title,
      date: dateStr,
      description: `**${event.title}**\n🕐 ${startTime}\n\n${event.description || ''}`,
    });

    console.log(`[Event Service] Roster update sent successfully to Discord.`);
  } catch (error) {
    console.error(
      'Discord sync error:',
      error && error.response ? error.response.data : error.message,
    );
  }
}

/**
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of events
 */
async function listEvents(filters) {
  if (!filters.realmId) {
    throw new AppError('realmId is required', 400);
  }

  return eventRepository.findAll(filters);
}

/**
 * @param {number} id - Event ID
 * @param {number} realmId - Realm ID for access control
 * @returns {Promise<Object>} Event with roster
 */
async function getEventDetails(id, realmId) {
  const hasAccess = await eventRepository.belongsToRealm(id, realmId);
  if (!hasAccess) {
    throw new AppError('Event not found or access denied', 404);
  }

  return eventRepository.findWithRoster(id);
}

/**
 * Apply default PRESENT status to all active roster members for a newly created event.
 * Called when defaultPresent=true. Does NOT overwrite ABSENT signups already set by applyAbsencesToEvent.
 * @param {Object} event - The event to populate
 */
async function applyDefaultPresentToEvent(event) {
  try {
    console.log(
      `[Event Service] Applying defaultPresent for event ${event.id} on realm ${event.realmId}`,
    );

    const activeCharacters = await prisma.characters.findMany({
      where: {
        realmId: event.realmId,
        status: { not: 'pending' },
      },
      select: { id: true, name: true },
    });

    console.log(
      `[Event Service] Found ${activeCharacters.length} active members for defaultPresent`,
    );

    for (const character of activeCharacters) {
      try {
        const existing = await signupRepository.findByEventAndCharacter(event.id, character.id);
        if (!existing) {
          await signupRepository.upsert({
            eventId: event.id,
            characterId: character.id,
            status: 'PRESENT',
          });
          console.log(
            `[Event Service] Auto-set PRESENT for ${character.name} on event ${event.id}`,
          );
        }
      } catch (err) {
        console.error(
          `[Event Service] Failed to set PRESENT for character ${character.id}:`,
          err.message,
        );
      }
    }
  } catch (error) {
    console.error('[Event Service] Error applying defaultPresent to event:', error.message);
    // Non-critical, don't throw
  }
}

/**
 * @param {Object} data - Event data
 * @param {string} userId - User ID creating the event
 * @returns {Promise<Object>} Created event
 */
async function createEvent(data, userId) {
  if (!data.realmId) {
    throw new AppError('realmId is required', 400);
  }

  const event = await eventRepository.create({
    ...data,
    createdBy: String(userId), // Convert to string to match Prisma schema
  });

  await applyAbsencesToEvent(event);

  if (data.defaultPresent) {
    await applyDefaultPresentToEvent(event);
  }

  const discordData = await syncToDiscord(event, 'create');

  if (discordData) {
    const updatedEvent = await eventRepository.update(event.id, {
      discordChannelId: discordData.discordChannelId,
      discordMessageId: discordData.discordMessageId,
    });

    await syncRosterToDiscord(event.id);

    return updatedEvent;
  }

  return event;
}

/**
 * Apply existing absences to a newly created event
 * Finds all users who have declared absences for the event date and creates ABSENT signups
 * @param {Object} event - The event to check absences for
 */
async function applyAbsencesToEvent(event, excludeCharIds = new Set()) {
  try {
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);

    console.log(
      `[Event Service] Checking absences for event ${event.id} on ${eventDate.toISOString()}`,
    );

    const absences = await absenceRepository.findAll({
      realmId: event.realmId,
      startDate: eventDate,
      endDate: eventDate,
    });

    console.log(`[Event Service] Found ${absences.length} absences for this date`);

    for (const absence of absences) {
      const userCharacters = await prisma.characters.findMany({
        where: {
          userId: String(absence.userId),
          realmId: event.realmId,
          archived: 0,
        },
        select: { id: true, name: true },
      });

      console.log(`[Event Service] User ${absence.userId} has ${userCharacters.length} characters`);

      for (const character of userCharacters) {
        if (excludeCharIds.has(character.id)) continue;
        try {
          await signupRepository.upsert({
            eventId: event.id,
            characterId: character.id,
            status: 'ABSENT',
            absenceReason: absence.reason || null,
          });
          console.log(`[Event Service] Auto-set ABSENT for ${character.name} on event ${event.id}`);
        } catch (error) {
          console.error(
            `[Event Service] Failed to set ABSENT for character ${character.id}:`,
            error.message,
          );
        }
      }
    }
  } catch (error) {
    console.error('[Event Service] Error applying absences to event:', error.message);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * @param {number} id - Event ID
 * @param {Object} data - Updated data
 * @param {number} realmId - Realm ID for access control
 * @returns {Promise<Object>} Updated event
 */
async function updateEvent(id, data, realmId) {
  const hasAccess = await eventRepository.belongsToRealm(id, realmId);
  if (!hasAccess) {
    throw new AppError('Event not found or access denied', 404);
  }

  if (data.startTime) {
    const previous = await prisma.raid_events.findUnique({
      where: { id },
      select: { startTime: true, reminderSentAt: true },
    });
    const newStart = new Date(data.startTime);
    if (
      previous?.reminderSentAt &&
      previous.startTime &&
      newStart.getTime() > previous.startTime.getTime()
    ) {
      data.reminderSentAt = null;
    }
  }

  const event = await eventRepository.update(id, data);

  await syncToDiscord(event, 'update');

  return event;
}

/**
 * @param {number} id - Event ID
 * @param {number} realmId - Realm ID for access control
 * @returns {Promise<Object>} Cancelled event
 */
async function cancelEvent(id, realmId) {
  const hasAccess = await eventRepository.belongsToRealm(id, realmId);
  if (!hasAccess) {
    throw new AppError('Event not found or access denied', 404);
  }

  const event = await eventRepository.findById(id);

  const cancelledEvent = await eventRepository.update(id, { status: 'CANCELLED' });

  await syncToDiscord(event, 'delete');

  return cancelledEvent;
}

/**
 * Delete an event permanently
 * @param {number} id - Event ID
 * @param {number} realmId - Realm ID for access control
 * @returns {Promise<Object>} Deleted event
 */
async function deleteEvent(id, realmId) {
  const hasAccess = await eventRepository.belongsToRealm(id, realmId);
  if (!hasAccess) {
    throw new AppError('Event not found or access denied', 404);
  }

  const event = await eventRepository.findById(id);

  await syncToDiscord(event, 'delete');

  return eventRepository.remove(id);
}

/**
 * Duplicate an event, optionally copying active signups
 * @param {number} id - Source event ID
 * @param {number} realmId - Realm ID for access control
 * @param {Object} options - { title?: string, copySignups: boolean }
 * @param {string} userId - User creating the duplicate
 * @returns {Promise<Object>} New event
 */
async function duplicateEvent(id, realmId, options, userId) {
  const original = await eventRepository.findById(id);
  if (!original || original.realmId !== realmId) {
    throw new AppError('Event not found or access denied', 404);
  }

  const newTitle = options.title || `${original.title} (2)`;

  const newEvent = await eventRepository.create({
    title: newTitle,
    description: original.description,
    startTime: original.startTime,
    endTime: original.endTime,
    raidDifficultyId: original.raidDifficultyId,
    realmId: original.realmId,
    isOptional: original.isOptional,
    defaultPresent: original.defaultPresent,
    signupLockDisabled: original.signupLockDisabled,
    createdBy: String(userId),
  });

  if (options.copySignups) {
    const signups = await signupRepository.findByEvent(id);
    const toCopy = signups.filter((s) =>
      ['PRESENT', 'TENTATIVE', 'LATE', 'BENCH'].includes(s.status),
    );
    if (toCopy.length > 0) {
      await prisma.raid_signups.createMany({
        data: toCopy.map((s) => ({
          eventId: newEvent.id,
          characterId: s.characterId,
          status: s.status,
          role: s.role,
          lateTime: s.lateTime || null,
        })),
        skipDuplicates: true,
      });
    }
    const copiedCharIds = new Set(toCopy.map((s) => s.characterId));
    await applyAbsencesToEvent(newEvent, copiedCharIds);
  } else {
    await applyAbsencesToEvent(newEvent);
    if (original.defaultPresent) {
      await applyDefaultPresentToEvent(newEvent);
    }
  }

  const discordData = await syncToDiscord(newEvent, 'create');
  if (discordData) {
    const updatedEvent = await eventRepository.update(newEvent.id, {
      discordChannelId: discordData.discordChannelId,
      discordMessageId: discordData.discordMessageId,
    });
    await syncRosterToDiscord(newEvent.id);
    return updatedEvent;
  }

  return newEvent;
}

/**
 * Check whether the Discord user (by tag) has admin/moderator role on the event's realm.
 * Used to authorize sensitive bot actions (e.g. pinging non-responders).
 * @param {number} eventId
 * @param {string} discordTag
 * @returns {Promise<boolean>}
 */
async function isDiscordUserAdminOnEvent(eventId, discordTag) {
  if (!discordTag) return false;
  const event = await eventRepository.findById(eventId);
  if (!event) return false;

  const character = await characterRepository.findCharacterByDiscordTag(discordTag);
  if (!character?.userId) return false;

  const role = await realmRepository.getRealmUserRole(event.realmId, character.userId);
  return ADMIN_ROLES.has(role);
}

/**
 * Return the Discord tags of active characters who haven't signed up yet.
 * Used by the bot's "Ping non-responders" button.
 * @param {number} eventId
 * @returns {Promise<Array<{ name: string, discordTag: string }>>}
 */
async function getNoStatusDiscordTags(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  const signedUpIds = new Set((event.signups ?? []).map((s) => s.characterId));

  const characters = await prisma.characters.findMany({
    where: {
      realmId: event.realmId,
      archived: 0,
      status: { not: 'pending' },
      discordTag: { not: '' },
    },
    select: { id: true, name: true, discordTag: true },
  });

  return characters
    .filter((c) => !signedUpIds.has(c.id) && c.discordTag)
    .map((c) => ({ name: c.name, discordTag: c.discordTag }));
}

module.exports = {
  listEvents,
  getEventDetails,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
  duplicateEvent,
  syncRosterToDiscord,
  getNoStatusDiscordTags,
  isDiscordUserAdminOnEvent,
};
