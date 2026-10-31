import {
  findNonHolders,
  holdersByBoss,
  isBossOfEvent,
  isEmptyNote,
  normalizeInput,
  toBossNoteView,
} from '../boss_note.rules';
import type { BossNoteWithAssignments } from '../boss_note.types';

describe('isBossOfEvent', () => {
  const raid = { extension: 'Midnight', season: 'season-01' };

  it('accepts a boss of the raid extension and season', () => {
    expect(isBossOfEvent({ extension: 'Midnight', season: 'season-01' }, raid)).toBe(true);
  });

  it('refuses a boss of another season', () => {
    expect(isBossOfEvent({ extension: 'Midnight', season: 'season-02' }, raid)).toBe(false);
  });

  it('refuses a boss of another extension', () => {
    expect(isBossOfEvent({ extension: 'The-War-Within', season: 'season-01' }, raid)).toBe(false);
  });

  it('accepts any boss when the event has no known raid', () => {
    expect(isBossOfEvent({ extension: 'X', season: 'Y' }, null)).toBe(true);
    expect(isBossOfEvent({ extension: 'X', season: 'Y' }, { extension: null, season: null })).toBe(
      true,
    );
  });
});

describe('normalizeInput / isEmptyNote', () => {
  it('trims the content and the tasks, and drops assignments without task', () => {
    const clean = normalizeInput({
      content: '  ## Plan \n',
      assignments: [
        { characterId: 1, task: '  soak gauche ' },
        { characterId: 2, task: '   ' },
      ],
    });
    expect(clean).toEqual({
      content: '## Plan',
      assignments: [{ characterId: 1, task: 'soak gauche' }],
    });
  });

  it('is empty without text nor assignment', () => {
    expect(isEmptyNote(normalizeInput({ content: '  ', assignments: [] }))).toBe(true);
    expect(isEmptyNote({ content: '', assignments: [{ characterId: 1, task: 'x' }] })).toBe(false);
    expect(isEmptyNote({ content: 'x', assignments: [] })).toBe(false);
  });
});

describe('findNonHolders', () => {
  it('lists each assignee missing from the boss roster once, in order', () => {
    const assignments = [
      { characterId: 3, task: 'a' },
      { characterId: 1, task: 'b' },
      { characterId: 3, task: 'c' },
      { characterId: 2, task: 'd' },
    ];
    expect(findNonHolders(assignments, new Set([1]))).toEqual([3, 2]);
  });

  it('is empty when every assignee holds the boss', () => {
    expect(findNonHolders([{ characterId: 1, task: 'a' }], new Set([1, 2]))).toEqual([]);
  });
});

describe('holdersByBoss', () => {
  it('groups the roster rows per boss and ignores rows without boss', () => {
    const map = holdersByBoss([
      { characterId: 1, bossId: 10 },
      { characterId: 2, bossId: 10 },
      { characterId: 1, bossId: 11 },
      { characterId: 9, bossId: null },
    ]);
    expect([...(map.get(10) ?? [])]).toEqual([1, 2]);
    expect([...(map.get(11) ?? [])]).toEqual([1]);
    expect(map.size).toBe(2);
  });
});

describe('toBossNoteView', () => {
  const updatedAt = new Date('2026-10-10T20:00:00Z');
  const note = {
    id: 5,
    eventId: 1,
    bossId: 10,
    content: 'Plan',
    updatedBy: 'u1',
    createdAt: updatedAt,
    updatedAt,
    assignments: [
      {
        id: 2,
        noteId: 5,
        characterId: 8,
        task: 'kick',
        position: 1,
        character: { id: 8, name: 'Gone', class: 'Rogue' },
      },
      {
        id: 1,
        noteId: 5,
        characterId: 7,
        task: 'soak',
        position: 0,
        character: { id: 7, name: 'Tanky', class: 'Warrior' },
      },
    ],
  } satisfies BossNoteWithAssignments;

  it('orders assignments by position and flags those who left the boss roster', () => {
    const view = toBossNoteView(note, new Set([7]));
    expect(view).toEqual({
      eventId: 1,
      bossId: 10,
      content: 'Plan',
      updatedAt,
      assignments: [
        {
          characterId: 7,
          characterName: 'Tanky',
          characterClass: 'Warrior',
          task: 'soak',
          position: 0,
          isHolder: true,
        },
        {
          characterId: 8,
          characterName: 'Gone',
          characterClass: 'Rogue',
          task: 'kick',
          position: 1,
          isHolder: false,
        },
      ],
    });
  });

  it('does not expose who edited the note', () => {
    expect(toBossNoteView(note, new Set())).not.toHaveProperty('updatedBy');
  });
});
