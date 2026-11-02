import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BisSlot } from 'services/bis.service';

import { BisSlotEditor } from './BisSlotEditor';
import { BisSlotGrid } from './BisSlotGrid';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'fr' },
    t: (key: string, options?: Record<string, unknown>) => {
      const params = Object.entries(options ?? {})
        .filter(([name]) => name !== 'defaultValue')
        .map(([, value]) => String(value));
      return params.length > 0 ? `${key}:${params.join(',')}` : key;
    },
  }),
}));

const wrap = (ui: React.ReactNode) => render(<MantineProvider>{ui}</MantineProvider>);

const HEAD: BisSlot = {
  slot: 'head',
  source: 'guild',
  season: 'tier-1',
  items: [
    { itemId: 101, note: 'BiS absolu' },
    { itemId: 102, note: null },
    { itemId: 103, note: null },
  ],
};
const NECK: BisSlot = {
  slot: 'neck',
  source: 'curated',
  season: 'tier-1',
  items: [{ itemId: 201, note: null }],
};

describe('BisSlotGrid', () => {
  it('affiche les objets dans l’ordre, le rang 1 en avant, avec note et origine', () => {
    wrap(<BisSlotGrid slots={[HEAD, NECK]} season="tier-1" />);

    const head = screen.getByTestId('bis-slot-head');
    const links = within(head).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.wowhead.com/forever/item=101',
      'https://www.wowhead.com/forever/item=102',
      'https://www.wowhead.com/forever/item=103',
    ]);
    expect(within(head).getByText('BiS absolu')).toBeInTheDocument();
    expect(within(head).getByText('origin.guild:tier-1')).toBeInTheDocument();
    expect(within(head).getByLabelText('rank:1')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('bis-slot-neck')).getByText('origin.curated:tier-1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('bis-slot-ranged')).getByText('slot_empty'),
    ).toBeInTheDocument();
  });

  it('signale une liste héritée d’un palier antérieur', () => {
    wrap(<BisSlotGrid slots={[HEAD]} season="tier-2" />);
    expect(screen.getByText('origin.previousTier:tier-1')).toBeInTheDocument();
  });

  it('n’offre aucune édition en lecture seule', () => {
    wrap(<BisSlotGrid slots={[HEAD, NECK]} season="tier-1" />);
    expect(screen.queryByRole('button', { name: /edit_slot/ })).toBeNull();
  });

  it('offre la modification de chaque emplacement à un responsable', () => {
    const onEditSlot = vi.fn();
    wrap(<BisSlotGrid slots={[HEAD, NECK]} season="tier-1" onEditSlot={onEditSlot} />);
    expect(screen.getAllByRole('button', { name: /edit_slot/ })).toHaveLength(18);
    fireEvent.click(screen.getByRole('button', { name: 'edit_slot:slots.neck' }));
    expect(onEditSlot).toHaveBeenCalledWith('neck');
  });
});

describe('BisSlotEditor', () => {
  const renderEditor = (slot: BisSlot = HEAD, season = 'tier-1') => {
    const onSave = vi.fn();
    const onReset = vi.fn();
    wrap(
      <BisSlotEditor
        slot={slot}
        season={season}
        onClose={vi.fn()}
        onSave={onSave}
        onReset={onReset}
        isSaving={false}
      />,
    );
    return { onSave, onReset };
  };

  it('réordonne, retire et ajoute un objet collé depuis Wowhead avant d’enregistrer', () => {
    const { onSave } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'editor.move_up_item:102' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor.remove_item:103' }));
    fireEvent.change(screen.getByLabelText('editor.item_label'), {
      target: { value: 'https://www.wowhead.com/forever/item=19019/thunderfury' },
    });
    fireEvent.change(screen.getByLabelText('editor.note_label'), { target: { value: ' Alt ' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.add' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor.save' }));

    expect(onSave).toHaveBeenCalledWith([
      { itemId: 102 },
      { itemId: 101, note: 'BiS absolu' },
      { itemId: 19019, note: 'Alt' },
    ]);
  });

  it('refuse un doublon sans l’ajouter', () => {
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText('editor.item_label'), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'editor.add' }));
    expect(screen.getByText('editor.errors.duplicate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'editor.save' }));
    expect(onSave.mock.calls[0][0]).toHaveLength(3);
  });

  it('propose le retour à la référence pour une liste de guilde du palier', () => {
    const { onReset } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'editor.reset' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('ne propose pas le retour à la référence quand l’emplacement suit la référence', () => {
    renderEditor(NECK);
    expect(screen.queryByRole('button', { name: 'editor.reset' })).toBeNull();
  });

  it('ne propose pas le retour à la référence pour une liste de guilde d’un palier antérieur', () => {
    renderEditor(HEAD, 'tier-2');
    expect(screen.queryByRole('button', { name: 'editor.reset' })).toBeNull();
  });
});
