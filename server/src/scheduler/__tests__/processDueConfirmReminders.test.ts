// Second rappel de raid (SIMS-143) : une seule exécution par événement.
import { processDueConfirmReminders } from '../confirmReminder';

const findEvents = vi.fn();
const updateManyEvents = vi.fn();
const updateEvent = vi.fn();
const findSignups = vi.fn();
const axiosPut = vi.fn();

vi.mock('../../data', () => ({
  prisma: {
    raid_events: {
      findMany: (...a: unknown[]) => findEvents(...a),
      updateMany: (...a: unknown[]) => updateManyEvents(...a),
      update: (...a: unknown[]) => updateEvent(...a),
    },
    raid_signups: { findMany: (...a: unknown[]) => findSignups(...a) },
  },
}));
vi.mock('axios', () => ({ default: { put: (...a: unknown[]) => axiosPut(...a) } }));
vi.mock('../../shared/config', () => ({ default: { discord: { url: 'http://bot' } } }));

const HOUR = 3600 * 1000;

function dueEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: 'Manaforge',
    startTime: new Date(Date.now() + HOUR),
    discordChannelId: 'chan',
    realm: { discordGuildId: 'guild', confirmReminderHours: 2 },
    ...overrides,
  };
}

beforeEach(() => {
  findEvents.mockReset().mockResolvedValue([dueEvent()]);
  updateManyEvents.mockReset().mockResolvedValue({ count: 1 });
  updateEvent.mockReset().mockResolvedValue({});
  findSignups.mockReset().mockResolvedValue([
    { status: 'PRESENT', role: 'TANK', character: { name: 'Tank', discordTag: 'tank' } },
    { status: 'TENTATIVE', role: 'HEALER', character: { name: 'Maybe', discordTag: 'maybe' } },
  ]);
  axiosPut.mockReset().mockResolvedValue({ data: { ok: true } });
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('processDueConfirmReminders', () => {
  it('only queries events not yet reminded, for guilds that enabled it', async () => {
    await processDueConfirmReminders();

    const { where } = findEvents.mock.calls[0][0];
    expect(where.confirmReminderSentAt).toBeNull();
    expect(where.realm.confirmReminderHours).toEqual({ gt: 0 });
  });

  it('claims the event then announces the composition to the bot', async () => {
    await processDueConfirmReminders();

    expect(updateManyEvents).toHaveBeenCalledWith({
      where: { id: 7, confirmReminderSentAt: null },
      data: { confirmReminderSentAt: expect.any(Date) },
    });
    expect(axiosPut).toHaveBeenCalledTimes(1);
    const [url, body, options] = axiosPut.mock.calls[0];
    expect(url).toBe('http://bot/api/discord/raid/confirm-reminder');
    expect(body).toMatchObject({
      guildId: 'guild',
      channelId: 'chan',
      composition: { tanks: [{ name: 'Tank' }] },
      tentative: [{ name: 'Maybe' }],
      players: [
        { name: 'Tank', discordTag: 'tank' },
        { name: 'Maybe', discordTag: 'maybe' },
      ],
    });
    expect(options).toMatchObject({ timeout: expect.any(Number) });
  });

  it('only reads starters and tentative signups', async () => {
    await processDueConfirmReminders();

    expect(findSignups.mock.calls[0][0].where).toEqual({
      eventId: 7,
      status: { in: ['PRESENT', 'LATE', 'TENTATIVE'] },
    });
  });

  it('does nothing when another tick already claimed the event', async () => {
    updateManyEvents.mockResolvedValueOnce({ count: 0 });

    await processDueConfirmReminders();

    expect(findSignups).not.toHaveBeenCalled();
    expect(axiosPut).not.toHaveBeenCalled();
  });

  it('does not claim an event whose window has not opened', async () => {
    findEvents.mockResolvedValueOnce([dueEvent({ startTime: new Date(Date.now() + 3 * HOUR) })]);

    await processDueConfirmReminders();

    expect(updateManyEvents).not.toHaveBeenCalled();
    expect(axiosPut).not.toHaveBeenCalled();
  });

  it('keeps processing the next events after one bot call fails', async () => {
    findEvents.mockResolvedValueOnce([dueEvent({ id: 1 }), dueEvent({ id: 2 })]);
    axiosPut.mockRejectedValueOnce(new Error('boom'));

    await processDueConfirmReminders();

    expect(axiosPut).toHaveBeenCalledTimes(2);
    expect(updateEvent).toHaveBeenCalledTimes(1);
    expect(updateEvent).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { confirmReminderSentAt: null },
    });
  });

  it.each([
    ['the bot answers with an error', { response: { status: 500 } }],
    ['the bot is unreachable', { code: 'ECONNREFUSED' }],
  ])('releases the claim when %s, so the next tick retries', async (_label, fields) => {
    axiosPut.mockRejectedValueOnce(Object.assign(new Error('bot failure'), fields));

    await processDueConfirmReminders();

    expect(updateEvent).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { confirmReminderSentAt: null },
    });
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'])(
    'keeps the claim when the call is interrupted (%s): the bot may have posted',
    async (code) => {
      axiosPut.mockRejectedValueOnce(Object.assign(new Error('interrupted'), { code }));

      await processDueConfirmReminders();

      expect(updateEvent).not.toHaveBeenCalled();
    },
  );

  it('announces the actual time left, not the configured delay', async () => {
    findEvents.mockResolvedValueOnce([dueEvent({ startTime: new Date(Date.now() + 45 * 60_000) })]);

    await processDueConfirmReminders();

    expect(axiosPut.mock.calls[0][1].headline).toContain('commence dans 45 min');
  });

  it('gives the start time in the realm time zone (SIMS-204)', async () => {
    const startTime = new Date(Date.now() + HOUR);
    findEvents.mockResolvedValueOnce([
      dueEvent({
        startTime,
        realm: { discordGuildId: 'guild', confirmReminderHours: 2, timezone: 'UTC' },
      }),
    ]);

    await processDueConfirmReminders();

    expect(findEvents.mock.calls[0][0].select.realm.select.timezone).toBe(true);
    expect(axiosPut.mock.calls[0][1].headline).toContain(
      `(${startTime.toISOString().slice(11, 16)})`,
    );
  });
});
