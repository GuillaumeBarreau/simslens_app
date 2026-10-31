import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BossNote } from 'services/bossNote.service';
import type { RosterAssignment } from 'services/roster.service';

import { BossNoteEditor } from './BossNoteEditor';
import { formatBossNoteText, parseInline, parseMarkdownLite } from './bossNotes.utils';
import { holdersOfBoss } from './BossNotesDrawer';
import { BossNoteView } from './BossNoteView';
import { MarkdownLite } from './MarkdownLite';

const note = (over: Partial<BossNote> = {}): BossNote => ({
  eventId: 1,
  bossId: 10,
  content: '## Phase 1\n- soak **gauche**',
  updatedAt: '2026-10-10T20:00:00Z',
  assignments: [
    {
      characterId: 8,
      characterName: 'Gone',
      characterClass: 'Rogue',
      task: 'kick',
      position: 1,
      isHolder: false,
    },
    {
      characterId: 7,
      characterName: 'Tanky',
      characterClass: 'Warrior',
      task: 'taunt',
      position: 0,
      isHolder: true,
    },
  ],
  ...over,
});

const wrap = (ui: React.ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

describe('parseInline', () => {
  it('splits bold segments', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('keeps an unclosed marker as plain text', () => {
    expect(parseInline('a **b')).toEqual([
      { text: 'a ', bold: false },
      { text: '**b', bold: false },
    ]);
  });
});

describe('parseMarkdownLite', () => {
  it('reads headings, lists and paragraphs', () => {
    const blocks = parseMarkdownLite('# Plan\nligne 1\nligne 2\n\n- un\n* deux\n### Fin');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'heading']);
    expect(blocks[0]).toEqual({
      type: 'heading',
      level: 1,
      spans: [{ text: 'Plan', bold: false }],
    });
    expect(blocks[1]).toMatchObject({
      type: 'paragraph',
      lines: [[{ text: 'ligne 1' }], [{ text: 'ligne 2' }]],
    });
    expect(blocks[2]).toMatchObject({
      type: 'list',
      items: [[{ text: 'un' }], [{ text: 'deux' }]],
    });
    expect(blocks[3]).toMatchObject({ type: 'heading', level: 3 });
  });

  it('treats four # as a paragraph', () => {
    expect(parseMarkdownLite('#### x')[0].type).toBe('paragraph');
  });

  it('accepts Windows line endings', () => {
    expect(parseMarkdownLite('a\r\n\r\nb')).toHaveLength(2);
  });
});

describe('formatBossNoteText', () => {
  it('formats the boss, the note and the holders’ assignments in order', () => {
    expect(formatBossNoteText('Boss', note(), 'Assignations')).toBe(
      '**Boss**\n\n## Phase 1\n- soak **gauche**\n\nAssignations\n- Tanky : taunt',
    );
  });

  it('omits the empty sections', () => {
    expect(formatBossNoteText('Boss', { content: '  ', assignments: [] }, 'A')).toBe('**Boss**');
  });
});

describe('holdersOfBoss', () => {
  const assignment = (characterId: number, bossId: number, name: string) =>
    ({
      characterId,
      bossId,
      character: { id: characterId, name, class: 'Mage' },
    }) as RosterAssignment;

  it('lists each holder of the boss once, by name', () => {
    const holders = holdersOfBoss(
      [
        assignment(2, 10, 'Zed'),
        assignment(1, 10, 'Ana'),
        assignment(2, 10, 'Zed'),
        assignment(3, 11, 'Other'),
      ],
      10,
    );
    expect(holders).toEqual([
      { characterId: 1, name: 'Ana' },
      { characterId: 2, name: 'Zed' },
    ]);
  });
});

describe('<MarkdownLite />', () => {
  it('renders HTML of the note as text, never as markup', () => {
    const { container } = wrap(
      <MarkdownLite content="<img src=x onerror=alert(1)> **<b>gras</b>**" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText('<b>gras</b>').tagName).toBe('STRONG');
  });
});

describe('<BossNoteView />', () => {
  it('shows the note, the assignments and flags those who left the boss', () => {
    wrap(<BossNoteView bossName="Boss" note={note()} />);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Tanky')).toBeInTheDocument();
    expect(screen.getByText('bossNotes.notHolder')).toBeInTheDocument();
    expect(screen.getByText('bossNotes.copy')).toBeInTheDocument();
  });

  it('offers editing only with an edit handler', () => {
    wrap(<BossNoteView bossName="Boss" note={note()} />);
    expect(screen.queryByText('bossNotes.edit')).toBeNull();
  });

  it('says when the boss has no note, without copy button', () => {
    const onEdit = vi.fn();
    wrap(<BossNoteView bossName="Boss" note={undefined} onEdit={onEdit} />);
    expect(screen.getByText('bossNotes.empty')).toBeInTheDocument();
    expect(screen.queryByText('bossNotes.copy')).toBeNull();
    fireEvent.click(screen.getByText('bossNotes.edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});

describe('<BossNoteEditor />', () => {
  it('saves the note without the assignments of players who left the boss', async () => {
    const onSave = vi.fn();
    wrap(
      <BossNoteEditor
        note={note()}
        holders={[{ characterId: 7, name: 'Tanky' }]}
        isSaving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.submit(screen.getByText('bossNotes.save').closest('form') as HTMLFormElement);

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        content: '## Phase 1\n- soak **gauche**',
        assignments: [{ characterId: 7, task: 'taunt' }],
      }),
    );
  });

  it('refuses an assignment without task', async () => {
    const onSave = vi.fn();
    wrap(
      <BossNoteEditor
        note={note({ assignments: [{ ...note().assignments[1], task: ' ' }] })}
        holders={[{ characterId: 7, name: 'Tanky' }]}
        isSaving={false}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.submit(screen.getByText('bossNotes.save').closest('form') as HTMLFormElement);

    expect(await screen.findByText('bossNotes.errors.taskRequired')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cannot add an assignment when nobody is placed on the boss', () => {
    wrap(
      <BossNoteEditor
        note={undefined}
        holders={[]}
        isSaving={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText('bossNotes.noHolders')).toBeInTheDocument();
    expect(screen.getByText('bossNotes.addAssignment').closest('button')).toBeDisabled();
  });
});
