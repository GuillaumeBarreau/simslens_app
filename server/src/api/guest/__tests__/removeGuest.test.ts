import { GuestNotFoundError } from '../guest.errors';
import { removeGuest } from '../usecases/removeGuest';

const remove = vi.fn();
const belongsToEvent = vi.fn();
const syncRosterToDiscord = vi.fn();

vi.mock('../guest.repository', () => ({
  default: {
    remove: (...a: unknown[]) => remove(...a),
    belongsToEvent: (...a: unknown[]) => belongsToEvent(...a),
  },
}));
vi.mock('../../event/event.service', () => ({
  default: { syncRosterToDiscord: (...a: unknown[]) => syncRosterToDiscord(...a) },
}));

beforeEach(() => {
  remove.mockReset().mockResolvedValue({ id: 4 });
  belongsToEvent.mockReset().mockResolvedValue(true);
  syncRosterToDiscord.mockReset().mockResolvedValue(undefined);
});

describe('removeGuest', () => {
  it('removes a guest of the event and resyncs Discord', async () => {
    await removeGuest(4, 7);
    expect(belongsToEvent).toHaveBeenCalledWith(4, 7);
    expect(remove).toHaveBeenCalledWith(4);
    expect(syncRosterToDiscord).toHaveBeenCalledWith(7);
  });

  it('refuses a guest of another event, before deleting (SIMS-162)', async () => {
    belongsToEvent.mockResolvedValueOnce(false);
    await expect(removeGuest(4, 7)).rejects.toBeInstanceOf(GuestNotFoundError);
    expect(remove).not.toHaveBeenCalled();
    expect(syncRosterToDiscord).not.toHaveBeenCalled();
  });
});
