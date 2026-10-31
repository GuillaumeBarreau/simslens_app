import {
  AssigneeNotHolderError,
  BossNoteEventNotFoundError,
  InvalidBossError,
} from '../boss_note.errors';
import { listBossNotes } from '../usecases/listBossNotes';
import { saveBossNote } from '../usecases/saveBossNote';

const findEventInRealm = vi.fn();
const findBossById = vi.fn();
const findHolders = vi.fn();
const findByEvent = vi.fn();
const replace = vi.fn();
const removeByBoss = vi.fn();

vi.mock('../boss_note.repository', () => ({
  default: {
    findEventInRealm: (...a: unknown[]) => findEventInRealm(...a),
    findBossById: (...a: unknown[]) => findBossById(...a),
    findHolders: (...a: unknown[]) => findHolders(...a),
    findByEvent: (...a: unknown[]) => findByEvent(...a),
    replace: (...a: unknown[]) => replace(...a),
    removeByBoss: (...a: unknown[]) => removeByBoss(...a),
  },
}));

const updatedAt = new Date('2026-10-10T20:00:00Z');
const storedNote = (bossId: number, characterIds: number[]) => ({
  id: 1,
  eventId: 1,
  bossId,
  content: 'Plan',
  updatedBy: 'u1',
  createdAt: updatedAt,
  updatedAt,
  assignments: characterIds.map((characterId, position) => ({
    id: position + 1,
    noteId: 1,
    characterId,
    task: `task ${characterId}`,
    position,
    character: { id: characterId, name: `Char${characterId}`, class: 'Mage' },
  })),
});

beforeEach(() => {
  findEventInRealm.mockReset().mockResolvedValue({
    id: 1,
    raid_difficulty: { raid: { extension: 'Midnight', season: 'season-01' } },
  });
  findBossById
    .mockReset()
    .mockResolvedValue({ id: 10, extension: 'Midnight', season: 'season-01' });
  findHolders.mockReset().mockResolvedValue([
    { characterId: 7, bossId: 10 },
    { characterId: 8, bossId: 10 },
  ]);
  findByEvent.mockReset().mockResolvedValue([]);
  replace.mockReset().mockImplementation(async (_e, bossId, data) =>
    storedNote(
      bossId,
      data.assignments.map((a: { characterId: number }) => a.characterId),
    ),
  );
  removeByBoss.mockReset().mockResolvedValue({ count: 1 });
});

describe('listBossNotes', () => {
  it('looks the event up within the checked realm', async () => {
    await listBossNotes(1, 3);
    expect(findEventInRealm).toHaveBeenCalledWith(1, 3);
  });

  it('refuses an event of another realm, before reading any note', async () => {
    findEventInRealm.mockResolvedValueOnce(null);
    await expect(listBossNotes(1, 3)).rejects.toBeInstanceOf(BossNoteEventNotFoundError);
    expect(findByEvent).not.toHaveBeenCalled();
  });

  it('flags, per boss, the assignees who left the roster of that boss', async () => {
    findByEvent.mockResolvedValueOnce([storedNote(10, [7, 9]), storedNote(11, [7])]);
    findHolders.mockResolvedValueOnce([
      { characterId: 7, bossId: 10 },
      { characterId: 9, bossId: 12 },
    ]);

    const notes = await listBossNotes(1, 3);

    expect(notes.map((n) => n.assignments.map((a) => [a.characterId, a.isHolder]))).toEqual([
      [
        [7, true],
        [9, false],
      ],
      [[7, false]],
    ]);
  });
});

describe('saveBossNote', () => {
  const params = (input: {
    content: string;
    assignments: { characterId: number; task: string }[];
  }) => ({
    eventId: 1,
    bossId: 10,
    realmId: 3,
    userId: 'u1',
    input,
  });

  it('saves the note and the assignments of holders of the boss', async () => {
    const note = await saveBossNote(
      params({ content: ' Plan ', assignments: [{ characterId: 7, task: ' soak ' }] }),
    );

    expect(findHolders).toHaveBeenCalledWith(1, 10);
    expect(replace).toHaveBeenCalledWith(1, 10, {
      content: 'Plan',
      updatedBy: 'u1',
      assignments: [{ characterId: 7, task: 'soak' }],
    });
    expect(note?.assignments).toEqual([
      expect.objectContaining({ characterId: 7, isHolder: true }),
    ]);
  });

  it('refuses an event of another realm, before writing', async () => {
    findEventInRealm.mockResolvedValueOnce(null);
    await expect(saveBossNote(params({ content: 'x', assignments: [] }))).rejects.toBeInstanceOf(
      BossNoteEventNotFoundError,
    );
    expect(findEventInRealm).toHaveBeenCalledWith(1, 3);
    expect(replace).not.toHaveBeenCalled();
    expect(removeByBoss).not.toHaveBeenCalled();
  });

  it('refuses an unknown boss', async () => {
    findBossById.mockResolvedValueOnce(null);
    await expect(saveBossNote(params({ content: 'x', assignments: [] }))).rejects.toBeInstanceOf(
      InvalidBossError,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('refuses a boss outside of the raid of the event', async () => {
    findBossById.mockResolvedValueOnce({ id: 10, extension: 'Midnight', season: 'season-02' });
    await expect(saveBossNote(params({ content: 'x', assignments: [] }))).rejects.toBeInstanceOf(
      InvalidBossError,
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('refuses to assign a character who is not on the roster of the boss', async () => {
    const error = await saveBossNote(
      params({
        content: 'x',
        assignments: [
          { characterId: 7, task: 'soak' },
          { characterId: 42, task: 'kick' },
        ],
      }),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AssigneeNotHolderError);
    expect((error as AssigneeNotHolderError).statusCode).toBe(400);
    expect((error as AssigneeNotHolderError).characterIds).toEqual([42]);
    expect(replace).not.toHaveBeenCalled();
  });

  it('deletes the note once emptied, without checking holders', async () => {
    const note = await saveBossNote(
      params({ content: '  ', assignments: [{ characterId: 42, task: ' ' }] }),
    );

    expect(note).toBeNull();
    expect(removeByBoss).toHaveBeenCalledWith(1, 10);
    expect(replace).not.toHaveBeenCalled();
  });

  it('still checks the boss before deleting an emptied note', async () => {
    findBossById.mockResolvedValueOnce(null);
    await expect(saveBossNote(params({ content: '', assignments: [] }))).rejects.toBeInstanceOf(
      InvalidBossError,
    );
    expect(removeByBoss).not.toHaveBeenCalled();
  });
});
