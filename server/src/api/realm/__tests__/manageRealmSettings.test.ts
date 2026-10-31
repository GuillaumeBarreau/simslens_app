import { updateRealmSettings } from '../usecases/manageRealmSettings';

const getRealmById = vi.fn();
const getRealmOwner = vi.fn();
const updateSettings = vi.fn();

vi.mock('../realm.repository', () => ({
  default: {
    getRealmById: (...a: unknown[]) => getRealmById(...a),
    getRealmOwner: (...a: unknown[]) => getRealmOwner(...a),
    updateRealmSettings: (...a: unknown[]) => updateSettings(...a),
  },
}));

beforeEach(() => {
  getRealmById
    .mockReset()
    .mockResolvedValue({ id: 3, signupLockHours: 24, signupReminderHours: 2 });
  getRealmOwner.mockReset().mockResolvedValue({ role: 'owner' });
  updateSettings.mockReset().mockResolvedValue({ id: 3 });
});

describe('updateRealmSettings — second rappel (confirmReminderHours)', () => {
  it('saves the second reminder delay', async () => {
    await updateRealmSettings(3, { confirmReminderHours: 2 }, 'me');

    expect(updateSettings).toHaveBeenCalledWith(3, { confirmReminderHours: 2 });
  });

  it('accepts 0 to disable it', async () => {
    await updateRealmSettings(3, { confirmReminderHours: 0 }, 'me');

    expect(updateSettings).toHaveBeenCalledWith(3, { confirmReminderHours: 0 });
  });

  it.each([-1, 1.5, 721, 'abc'])('refuses %s', async (value) => {
    await expect(
      updateRealmSettings(3, { confirmReminderHours: value as number }, 'me'),
    ).rejects.toMatchObject({ status: 400 });
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('leaves the delay untouched when absent from the request', async () => {
    await updateRealmSettings(3, { signupLockHours: 12 }, 'me');

    expect(updateSettings).toHaveBeenCalledWith(3, { signupLockHours: 12 });
  });

  it('refuses a moderator', async () => {
    getRealmOwner.mockResolvedValueOnce({ role: 'moderator' });

    await expect(updateRealmSettings(3, { confirmReminderHours: 2 }, 'me')).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('updateRealmSettings — fuseau des messages Discord (SIMS-204)', () => {
  it.each(['Europe/Paris', 'America/New_York', 'UTC'])('saves the time zone %s', async (tz) => {
    await updateRealmSettings(3, { timezone: tz }, 'me');

    expect(updateSettings).toHaveBeenCalledWith(3, { timezone: tz });
  });

  it.each(['Mars/Olympus', 'Paris', 'GMT+25'])('refuses the unknown time zone %s', async (tz) => {
    await expect(updateRealmSettings(3, { timezone: tz }, 'me')).rejects.toMatchObject({
      status: 400,
    });
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('leaves the time zone untouched when absent from the request', async () => {
    await updateRealmSettings(3, { confirmReminderHours: 2 }, 'me');

    expect(updateSettings.mock.calls[0][1]).not.toHaveProperty('timezone');
  });
});
