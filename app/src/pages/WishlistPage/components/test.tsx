import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { WishlistSlotList } from './WishlistSlotList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && 'name' in options ? `${key}:${options.name}` : key,
  }),
}));

vi.mock('components/domain/loot/WowheadLink', () => ({
  WowheadLink: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const wrap = (node: ReactNode) => render(<MantineProvider>{node}</MantineProvider>);

const baseProps = {
  characterClass: 'Monk',
  groups: [{ group: 'armor' as const, slots: ['head', 'shoulders'] }],
  wishlist: { head: { itemId: 1, itemName: 'Casque', icon: 'i', priority: 0 } },
  selectedSlot: null,
  sourceIndex: new Map([
    [
      1,
      {
        bossId: 1,
        bossName: 'Boss A',
        bossOrder: 1,
        dpsGain: 300,
        gainPercent: 0.3,
        hasSimData: true,
      },
    ],
  ]),
  difficulty: 'mythic' as const,
  onDifficultyChange: () => {},
};

describe('WishlistSlotList', () => {
  it('shows the wished item with its boss, and the best suggestion of an empty slot', () => {
    wrap(
      <WishlistSlotList
        {...baseProps}
        readOnly={false}
        onSelectSlot={() => {}}
        showInsights
        suggestions={{
          shoulders: {
            item: { id: 2, name: 'Épaulières', icon: 'j', quality: 4, inventoryType: 3 },
            bossName: 'Boss B',
            dpsGain: 4200,
            gainPercent: 4.2,
          },
        }}
      />,
    );
    expect(screen.getByText('Casque')).toBeTruthy();
    expect(screen.getByText('Boss A')).toBeTruthy();
    expect(screen.getByText('+300')).toBeTruthy();
    expect(screen.getByText(/list\.suggestion:Épaulières/)).toBeTruthy();
    expect(screen.getByText('+4.2k')).toBeTruthy();
  });

  it('opens a slot on click, unless the wishlist is read only', () => {
    const onSelect = vi.fn();
    const { unmount } = wrap(
      <WishlistSlotList
        {...baseProps}
        readOnly={false}
        onSelectSlot={onSelect}
        showInsights={false}
      />,
    );
    fireEvent.click(screen.getByText('list.empty_slot'));
    expect(onSelect).toHaveBeenCalledWith('shoulders');
    unmount();

    const readOnlySelect = vi.fn();
    wrap(
      <WishlistSlotList
        {...baseProps}
        readOnly
        onSelectSlot={readOnlySelect}
        showInsights={false}
      />,
    );
    fireEvent.click(screen.getByText('list.empty_slot'));
    expect(readOnlySelect).not.toHaveBeenCalled();
    expect(screen.queryByText('+300')).toBeNull();
  });
});
