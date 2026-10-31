import { EventNotAccessibleError } from '../roster.errors';
import { assignToRoster, CharacterNotInRealmError } from '../usecases/assignToRoster';

const findFirstEvent = vi.fn();
const findFirstCharacter = vi.fn();
const findManyCharacters = vi.fn();
const deleteManyAssignments = vi.fn();
const upsert = vi.fn();

vi.mock('../../../data', () => ({
  prisma: {
    raid_events: { findFirst: (...a: unknown[]) => findFirstEvent(...a) },
    characters: {
      findFirst: (...a: unknown[]) => findFirstCharacter(...a),
      findMany: (...a: unknown[]) => findManyCharacters(...a),
    },
    event_roster_assignments: { deleteMany: (...a: unknown[]) => deleteManyAssignments(...a) },
  },
}));
vi.mock('../roster.repository', () => ({
  default: { upsert: (...a: unknown[]) => upsert(...a) },
}));

const input = { characterId: 10, role: 'TANK', bossId: 2, position: 0 };

beforeEach(() => {
  findFirstEvent.mockReset().mockResolvedValue({ id: 1 });
  findFirstCharacter.mockReset().mockResolvedValue({ id: 10, userId: 'u1', realmId: 3 });
  findManyCharacters.mockReset().mockResolvedValue([]);
  deleteManyAssignments.mockReset().mockResolvedValue({ count: 0 });
  upsert.mockReset().mockResolvedValue({ id: 99 });
});

describe('assignToRoster', () => {
  it('refuses an event outside the realm, before any write', async () => {
    findFirstEvent.mockResolvedValueOnce(null);
    await expect(assignToRoster(1, 3, input)).rejects.toBeInstanceOf(EventNotAccessibleError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses a character outside the realm', async () => {
    findFirstCharacter.mockResolvedValueOnce(null);
    await expect(assignToRoster(1, 3, input)).rejects.toBeInstanceOf(CharacterNotInRealmError);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('places the character', async () => {
    await expect(assignToRoster(1, 3, input)).resolves.toEqual({ id: 99 });
    expect(upsert).toHaveBeenCalledWith({
      eventId: 1,
      characterId: 10,
      role: 'TANK',
      bossId: 2,
      position: 0,
    });
  });

  it('frees the slot held by another character of the same member', async () => {
    findManyCharacters.mockResolvedValueOnce([{ id: 11 }, { id: 12 }]);

    await assignToRoster(1, 3, input);

    expect(deleteManyAssignments).toHaveBeenCalledWith({
      where: { eventId: 1, bossId: 2, characterId: { in: [11, 12] } },
    });
  });

  it('scopes that release to the boss being assigned, not the whole event', async () => {
    findManyCharacters.mockResolvedValueOnce([{ id: 11 }]);

    await assignToRoster(1, 3, { ...input, bossId: 7 });

    expect(deleteManyAssignments).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ bossId: 7 }) }),
    );
  });

  it('never releases the character being assigned', async () => {
    await assignToRoster(1, 3, input);
    expect(findManyCharacters).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: 10 } }) }),
    );
  });

  it('skips the release when the member has no other character', async () => {
    await assignToRoster(1, 3, input);
    expect(deleteManyAssignments).not.toHaveBeenCalled();
  });

  it('skips the release for a character without a linked account', async () => {
    findFirstCharacter.mockResolvedValueOnce({ id: 10, userId: null, realmId: 3 });
    await assignToRoster(1, 3, input);
    expect(findManyCharacters).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalled();
  });

  it('defaults the position to zero and the boss to null', async () => {
    await assignToRoster(1, 3, { characterId: 10, role: 'HEALER' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ bossId: null, position: 0 }));
  });
});
