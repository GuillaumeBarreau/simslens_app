import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { isWantedPriority } from 'constants/wishlistPriority';
import type { ReactNode } from 'react';
import type { WishlistSlotAlternative, WishSlotStatus } from 'types/character.types';

import { formatGain } from './insights';
import { SlotAlternativesList } from './SlotAlternatives';
import { WishSlotMarker } from './WishSlotMarker';
import { WishStatusBadge } from './WishStatusBadge';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && 'gain' in options ? `${key}:${options.gain}` : key,
  }),
}));

vi.mock('components/domain/loot/WowheadLink', () => ({
  WowheadLink: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const wrap = (node: ReactNode) => render(<MantineProvider>{node}</MantineProvider>);

const status = (overrides: Partial<WishSlotStatus>): WishSlotStatus => ({
  itemId: 100,
  priority: 0,
  state: 'upgrade',
  obsolete: false,
  dpsGain: 120,
  gainPercent: 1.2,
  equippedItemLevel: null,
  ...overrides,
});

const alternative = (overrides: Partial<WishlistSlotAlternative>): WishlistSlotAlternative => ({
  itemId: 1,
  name: 'Casque',
  icon: null,
  quality: 4,
  itemLevel: 650,
  boss: { id: 1, name: 'Boss A' },
  dpsGain: 200,
  gainPercent: 2,
  hasSimData: true,
  isWish: false,
  ...overrides,
});

describe('wishlist priority (legacy rows)', () => {
  it('still ignores the legacy « not wanted » rows, like the server', () => {
    expect([0, 1, 5, null, undefined].map(isWantedPriority)).toEqual([
      true,
      true,
      false,
      true,
      true,
    ]);
  });
});

describe('formatGain', () => {
  it('rounds the DPS and keeps one decimal for the percentage', () => {
    expect(formatGain(120.6, 1.234)).toEqual({ gain: '121', percent: '1.2' });
  });
});

describe('WishSlotMarker', () => {
  it('flags an obsolete wish', () => {
    wrap(<WishSlotMarker status={status({ state: 'equipped', obsolete: true })} />);
    expect(screen.getByText('!')).toBeTruthy();
    expect(screen.getByLabelText('insights.status.equipped')).toBeTruthy();
  });

  it('renders nothing for a wish without alert, or without status', () => {
    wrap(<WishSlotMarker status={status({})} />);
    wrap(<WishSlotMarker />);
    expect(screen.queryByLabelText(/insights\./)).toBeNull();
  });

  it('does not flag an equipped item that still has a simulated gain', () => {
    wrap(<WishSlotMarker status={status({ state: 'equipped_upgrade' })} />);
    expect(screen.queryByText('!')).toBeNull();
  });
});

describe('WishStatusBadge', () => {
  it('names the state of the wish', () => {
    wrap(<WishStatusBadge status={status({ state: 'no_gain', obsolete: true, dpsGain: -5 })} />);
    expect(screen.getByText('insights.status.no_gain')).toBeTruthy();
  });
});

describe('SlotAlternativesList', () => {
  it('lists each raid item with its boss and simulated gain', () => {
    wrap(
      <SlotAlternativesList
        alternatives={[
          alternative({ itemId: 1, name: 'Casque A', dpsGain: 200 }),
          alternative({
            itemId: 2,
            name: 'Casque B',
            boss: { id: 2, name: 'Boss B' },
            isWish: true,
            dpsGain: -10,
          }),
          alternative({
            itemId: 3,
            name: 'Casque C',
            boss: { id: 3, name: 'Boss C' },
            hasSimData: false,
            dpsGain: null,
            gainPercent: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText('Casque A')).toBeTruthy();
    expect(screen.getByText('Boss A')).toBeTruthy();
    expect(screen.getByText('insights.gain:200')).toBeTruthy();
    expect(screen.getByText('insights.loss:-10')).toBeTruthy();
    expect(screen.getByText('insights.alternatives_current')).toBeTruthy();
    expect(screen.getByText('insights.alternatives_no_sim')).toBeTruthy();
  });

  it('says when the slot has no raid item', () => {
    wrap(<SlotAlternativesList alternatives={[]} />);
    expect(screen.getByText('insights.alternatives_empty')).toBeTruthy();
  });
});
