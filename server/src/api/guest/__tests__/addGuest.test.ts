import { RAID_ROLES } from '../../../shared/constants/roles';
import {
  GuestEventNotFoundError,
  GuestNameRequiredError,
  InvalidGuestRoleError,
} from '../guest.errors';
import { addGuest } from '../usecases/addGuest';

const create = vi.fn();
const findById = vi.fn();
const syncRosterToDiscord = vi.fn();

vi.mock('../guest.repository', () => ({
  default: { create: (...a: unknown[]) => create(...a) },
}));
vi.mock('../../event/event.repository', () => ({
  default: { findById: (...a: unknown[]) => findById(...a) },
}));
vi.mock('../../event/event.service', () => ({
  default: { syncRosterToDiscord: (...a: unknown[]) => syncRosterToDiscord(...a) },
}));

const validInput = { eventId: 7, name: 'Bob', role: 'TANK' };

beforeEach(() => {
  create.mockReset().mockResolvedValue({ id: 1 });
  findById.mockReset().mockResolvedValue({ realmId: 3 });
  syncRosterToDiscord.mockReset().mockResolvedValue(undefined);
});

describe('addGuest', () => {
  it.each(RAID_ROLES)('accepts the %s role', async (role: string) => {
    await expect(addGuest({ ...validInput, role })).resolves.toEqual({ id: 1 });
  });

  it('normalises the role case before storing it', async () => {
    await addGuest({ ...validInput, role: 'tank' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ role: 'TANK' }));
  });

  it('rejects a role that is not a raid role', async () => {
    await expect(addGuest({ ...validInput, role: 'DPS' })).rejects.toBeInstanceOf(
      InvalidGuestRoleError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a blank name before touching the database', async () => {
    await expect(addGuest({ ...validInput, name: '   ' })).rejects.toBeInstanceOf(
      GuestNameRequiredError,
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('trims the guest name', async () => {
    await addGuest({ ...validInput, name: '  Bob  ' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Bob' }));
  });

  it('fails when the event does not exist', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(addGuest(validInput)).rejects.toBeInstanceOf(GuestEventNotFoundError);
    expect(create).not.toHaveBeenCalled();
  });

  it("falls back to the event's realm when none is given", async () => {
    await addGuest(validInput);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ realmId: 3 }));
  });

  it('prefers an explicitly provided realm', async () => {
    await addGuest({ ...validInput, realmId: 42 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ realmId: 42 }));
  });

  it('triggers the Discord sync for the event', async () => {
    await addGuest(validInput);
    expect(syncRosterToDiscord).toHaveBeenCalledWith(7);
  });

  it('still returns the guest when the Discord sync fails', async () => {
    syncRosterToDiscord.mockRejectedValueOnce(new Error('bot down'));
    await expect(addGuest(validInput)).resolves.toEqual({ id: 1 });
  });
});
