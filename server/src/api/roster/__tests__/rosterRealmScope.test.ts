import { EventNotAccessibleError } from '../roster.errors';
import { importRosterFromEvent } from '../usecases/importRosterFromEvent';
import { removeFromRoster, reorderRoster } from '../usecases/manageRosterAssignments';

/**
 * Rattachement au royaume des identifiants secondaires du roster (SIMS-182) :
 * checkPermission ne vérifie que l'événement de la route, les usecases
 * rattachent le reste.
 */

const findFirstEvent = vi.fn();
const updateManyAssignments = vi.fn();
const findManyCharacters = vi.fn();
const findManySignups = vi.fn();
const findAllAssignmentsForImport = vi.fn();
const removeAssignment = vi.fn();

vi.mock('../../../data', () => ({
  prisma: {
    raid_events: { findFirst: (...a: unknown[]) => findFirstEvent(...a) },
    event_roster_assignments: { updateMany: (...a: unknown[]) => updateManyAssignments(...a) },
    characters: { findMany: (...a: unknown[]) => findManyCharacters(...a) },
    raid_signups: { findMany: (...a: unknown[]) => findManySignups(...a) },
  },
}));
vi.mock('../roster.repository', () => ({
  default: {
    findAllAssignmentsForImport: (...a: unknown[]) => findAllAssignmentsForImport(...a),
    remove: (...a: unknown[]) => removeAssignment(...a),
  },
}));
const assignToRoster = vi.fn();
vi.mock('../usecases/assignToRoster', () => ({
  assignToRoster: (...a: unknown[]) => assignToRoster(...a),
}));

beforeEach(() => {
  findFirstEvent.mockReset().mockResolvedValue({ id: 1 });
  updateManyAssignments.mockReset().mockResolvedValue({ count: 1 });
  findManyCharacters.mockReset().mockResolvedValue([{ id: 10 }]);
  findManySignups.mockReset().mockResolvedValue([]);
  findAllAssignmentsForImport
    .mockReset()
    .mockResolvedValue([{ characterId: 10, role: 'TANK', bossId: 2, position: 0 }]);
  removeAssignment.mockReset().mockResolvedValue({ count: 1 });
  assignToRoster.mockReset().mockResolvedValue({ id: 99 });
});

describe('importRosterFromEvent', () => {
  it('looks both events up within the realm of the route', async () => {
    await importRosterFromEvent(1, 3, 7);

    expect(findFirstEvent).toHaveBeenCalledWith({ where: { id: 1, realmId: 3 } });
    expect(findFirstEvent).toHaveBeenCalledWith({ where: { id: 7, realmId: 3 } });
  });

  it('refuses a source event of another realm, before reading its roster', async () => {
    findFirstEvent.mockImplementation(async ({ where }: { where: { id: number } }) =>
      where.id === 7 ? null : { id: where.id },
    );

    await expect(importRosterFromEvent(1, 3, 7)).rejects.toBeInstanceOf(EventNotAccessibleError);
    expect(findAllAssignmentsForImport).not.toHaveBeenCalled();
    expect(assignToRoster).not.toHaveBeenCalled();
  });

  it('only imports characters still active in the realm', async () => {
    await importRosterFromEvent(1, 3, 7);

    expect(findManyCharacters).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ realmId: 3 }) }),
    );
    expect(assignToRoster).toHaveBeenCalledWith(1, 3, expect.objectContaining({ characterId: 10 }));
  });
});

describe('reorderRoster', () => {
  it('only touches assignments of the checked event', async () => {
    await reorderRoster(1, 3, 2, 'TANK', [10, 11]);

    expect(updateManyAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 1, characterId: 10, bossId: 2, role: 'TANK' } }),
    );
  });

  it('refuses an event outside the realm, before any write', async () => {
    findFirstEvent.mockResolvedValueOnce(null);

    await expect(reorderRoster(1, 3, 2, 'TANK', [10])).rejects.toBeInstanceOf(
      EventNotAccessibleError,
    );
    expect(updateManyAssignments).not.toHaveBeenCalled();
  });
});

describe('removeFromRoster', () => {
  it('removes the character only from the checked event', async () => {
    await removeFromRoster(1, 10, 3, 2);
    expect(removeAssignment).toHaveBeenCalledWith(1, 10, 2);
  });

  it('refuses an event outside the realm, before any write', async () => {
    findFirstEvent.mockResolvedValueOnce(null);

    await expect(removeFromRoster(1, 10, 3)).rejects.toBeInstanceOf(EventNotAccessibleError);
    expect(removeAssignment).not.toHaveBeenCalled();
  });
});
