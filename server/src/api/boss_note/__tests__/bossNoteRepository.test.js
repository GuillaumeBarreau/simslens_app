import { afterEach, describe, expect, it, vi } from 'vitest';

const { prisma } = require('../../../data');
const repo = require('../boss_note.repository');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('boss note repository — findEventInRealm', () => {
  it('matches the event on both its id and the realm', async () => {
    const findFirst = vi.spyOn(prisma.raid_events, 'findFirst').mockResolvedValue(null);
    await expect(repo.findEventInRealm(1, 3)).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, realmId: 3 } }),
    );
  });
});

describe('boss note repository — findHolders', () => {
  it('reads the roster of one boss of the event', async () => {
    const findMany = vi.spyOn(prisma.event_roster_assignments, 'findMany').mockResolvedValue([]);
    await repo.findHolders(1, 10);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 1, bossId: 10 } }),
    );
  });

  it('reads the whole roster of the event without boss', async () => {
    const findMany = vi.spyOn(prisma.event_roster_assignments, 'findMany').mockResolvedValue([]);
    await repo.findHolders(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: 1 } }));
  });
});

describe('boss note repository — replace', () => {
  it('upserts the note of the boss and rewrites its assignments in order', async () => {
    const tx = {
      event_boss_notes: {
        upsert: vi.fn().mockResolvedValue({ id: 5 }),
        findUnique: vi.fn().mockResolvedValue({ id: 5, assignments: [] }),
      },
      event_boss_note_assignments: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((fn) => fn(tx));

    await repo.replace(1, 10, {
      content: 'Plan',
      updatedBy: 'u1',
      assignments: [
        { characterId: 7, task: 'soak' },
        { characterId: 8, task: 'kick' },
      ],
    });

    expect(tx.event_boss_notes.upsert).toHaveBeenCalledWith({
      where: { eventId_bossId: { eventId: 1, bossId: 10 } },
      create: { eventId: 1, bossId: 10, content: 'Plan', updatedBy: 'u1' },
      update: { content: 'Plan', updatedBy: 'u1' },
    });
    expect(tx.event_boss_note_assignments.deleteMany).toHaveBeenCalledWith({
      where: { noteId: 5 },
    });
    expect(tx.event_boss_note_assignments.createMany).toHaveBeenCalledWith({
      data: [
        { noteId: 5, characterId: 7, task: 'soak', position: 0 },
        { noteId: 5, characterId: 8, task: 'kick', position: 1 },
      ],
    });
  });

  it('only clears the assignments when none is given', async () => {
    const tx = {
      event_boss_notes: {
        upsert: vi.fn().mockResolvedValue({ id: 5 }),
        findUnique: vi.fn().mockResolvedValue({ id: 5, assignments: [] }),
      },
      event_boss_note_assignments: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn(),
      },
    };
    vi.spyOn(prisma, '$transaction').mockImplementation((fn) => fn(tx));

    await repo.replace(1, 10, { content: 'Plan', updatedBy: 'u1', assignments: [] });

    expect(tx.event_boss_note_assignments.createMany).not.toHaveBeenCalled();
  });
});

describe('boss note repository — removeByBoss', () => {
  it('deletes only the note of this boss on this event', async () => {
    const deleteMany = vi
      .spyOn(prisma.event_boss_notes, 'deleteMany')
      .mockResolvedValue({ count: 1 });
    await repo.removeByBoss(1, 10);
    expect(deleteMany).toHaveBeenCalledWith({ where: { eventId: 1, bossId: 10 } });
  });
});
