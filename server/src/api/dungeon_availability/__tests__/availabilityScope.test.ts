import { REALM_ROLES_EDITING_ANY } from '../dungeon_availability.constants';
import { AvailabilityNotFoundError } from '../dungeon_availability.errors';
import { getAvailabilityForRealm } from '../usecases/listAvailabilities';
import { removeAvailabilityForRealm } from '../usecases/removeAvailability';
import { updateAvailabilityForRealm } from '../usecases/updateAvailability';

const belongsToRealm = vi.fn();
const findById = vi.fn();
const update = vi.fn();
const remove = vi.fn();

vi.mock('../dungeon_availability.repository', () => ({
  default: {
    belongsToRealm: (...a: unknown[]) => belongsToRealm(...a),
    findById: (...a: unknown[]) => findById(...a),
    update: (...a: unknown[]) => update(...a),
    remove: (...a: unknown[]) => remove(...a),
  },
}));

beforeEach(() => {
  belongsToRealm.mockReset().mockResolvedValue(true);
  findById.mockReset().mockResolvedValue({ id: 1 });
  update.mockReset().mockResolvedValue({ id: 1 });
  remove.mockReset().mockResolvedValue({ id: 1 });
});

describe('getAvailabilityForRealm', () => {
  it('scopes the lookup to the realm only, not to a member', async () => {
    await getAvailabilityForRealm(1, 3);
    expect(belongsToRealm).toHaveBeenCalledWith(1, 3);
  });

  it('raises a typed 404 when out of scope, without reading the row', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(getAvailabilityForRealm(1, 9)).rejects.toBeInstanceOf(AvailabilityNotFoundError);
    expect(findById).not.toHaveBeenCalled();
  });
});

describe('updateAvailabilityForRealm', () => {
  it('restricts an ordinary member to his own slots', async () => {
    await updateAvailabilityForRealm(1, { realmId: 3, userId: 'u1', realmRole: 'member' }, {});
    expect(belongsToRealm).toHaveBeenCalledWith(1, 3, 'u1');
  });

  it.each(REALM_ROLES_EDITING_ANY)(
    'lets a %s edit any slot of the realm',
    async (realmRole: string) => {
      await updateAvailabilityForRealm(1, { realmId: 3, userId: 'u1', realmRole }, {});
      expect(belongsToRealm).toHaveBeenCalledWith(1, 3, null);
    },
  );

  it('treats a missing role as an ordinary member', async () => {
    await updateAvailabilityForRealm(1, { realmId: 3, userId: 'u1' }, {});
    expect(belongsToRealm).toHaveBeenCalledWith(1, 3, 'u1');
  });

  it('raises a typed 404 without updating when out of scope', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(
      updateAvailabilityForRealm(1, { realmId: 9, userId: 'u1' }, {}),
    ).rejects.toBeInstanceOf(AvailabilityNotFoundError);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('removeAvailabilityForRealm', () => {
  it('always restricts removal to the caller own slots', async () => {
    await removeAvailabilityForRealm(1, { realmId: 3, userId: 'u1', realmRole: 'admin' });
    expect(belongsToRealm).toHaveBeenCalledWith(1, 3, 'u1');
  });

  it('raises a typed 404 without deleting when out of scope', async () => {
    belongsToRealm.mockResolvedValueOnce(false);
    await expect(
      removeAvailabilityForRealm(1, { realmId: 9, userId: 'u1' }),
    ).rejects.toBeInstanceOf(AvailabilityNotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });
});
