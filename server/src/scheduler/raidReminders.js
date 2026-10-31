const schedule = require('node-schedule');
const axios = require('axios');
const { prisma } = require('../data');
const config = require('../shared/config');
const eventService = require('../api/event/event.service');
const { processDueConfirmReminders } = require('./confirmReminder');
const { signupReminderHeadline } = require('./signupReminder');

/**
 * Find raid events whose signup-reminder window has just opened and that
 * have not been pinged yet, then ask the bot to ping non-responders.
 *
 * Window opens at: startTime - (signupLockHours + signupReminderHours)
 * `reminderSentAt IS NULL` ensures one-shot delivery — and we use a
 * conditional update to avoid double-firing across overlapping ticks.
 */
async function processDueReminders() {
  const now = new Date();

  const events = await prisma.raid_events.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSentAt: null,
      startTime: { gt: now },
      discordChannelId: { not: null },
      discordMessageId: { not: null },
      realm: { discordGuildId: { not: null } },
    },
    select: {
      id: true,
      startTime: true,
      discordChannelId: true,
      realm: {
        select: {
          discordGuildId: true,
          signupLockHours: true,
          signupReminderHours: true,
          timezone: true,
        },
      },
    },
  });

  for (const event of events) {
    const lockHours = event.realm.signupLockHours ?? 24;
    const reminderHours = event.realm.signupReminderHours ?? 2;

    if (lockHours <= 0 || reminderHours <= 0) continue;

    const triggerAt = new Date(
      event.startTime.getTime() - (lockHours + reminderHours) * 3600 * 1000,
    );
    if (now.getTime() < triggerAt.getTime()) continue;

    const claim = await prisma.raid_events.updateMany({
      where: { id: event.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (claim.count === 0) continue;

    try {
      const players = await eventService.getNoStatusDiscordTags(event.id);
      if (players.length === 0) {
        console.log(`[RaidReminders] Event ${event.id}: nobody left to ping.`);
        continue;
      }

      await axios.put(`${config.discord.url}/api/discord/raid/ping-no-responders`, {
        guildId: event.realm.discordGuildId,
        channelId: event.discordChannelId,
        players,
        headline: signupReminderHeadline(event.startTime, lockHours, event.realm.timezone),
      });
      console.log(`[RaidReminders] Event ${event.id}: pinged ${players.length} player(s).`);
    } catch (err) {
      console.error(
        `[RaidReminders] Event ${event.id}: failed to ping (${err.response?.status || ''})`,
        err.message,
      );
      await prisma.raid_events
        .update({ where: { id: event.id }, data: { reminderSentAt: null } })
        .catch(() => null);
    }
  }
}

function scheduleRaidReminders() {
  schedule.scheduleJob('* * * * *', async () => {
    try {
      await processDueReminders();
    } catch (err) {
      console.error('[RaidReminders] Tick failed:', err.message);
    }
    try {
      await processDueConfirmReminders();
    } catch (err) {
      console.error('[RaidReminders] Confirm tick failed:', err.message);
    }
  });
  console.log('[RaidReminders] Scheduler armed (every minute).');
}

module.exports = { scheduleRaidReminders, processDueReminders };
