import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import type { RosterHiddenSpecWishlists } from 'types/character.types';

import { HiddenOnlyWishlistsAlert, withoutShownWishlist } from './HiddenSpecWishlists';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { spec?: string; count?: number; defaultValue?: string }) => {
      if (key === 'roster_hidden_spec_item') return `${options?.spec}: ${options?.count}`;
      return options?.defaultValue ?? key;
    },
  }),
}));

const entry = (
  id: number,
  name: string,
  specs: RosterHiddenSpecWishlists['hiddenSpecializations'],
) => ({
  character: { id, name, class: 'mage', specializationId: 62 },
  displayedSpecializationId: 62,
  hiddenSpecializations: specs,
});

const FROSTY = entry(1, 'Frosty', [
  { id: 63, name: 'Fire', itemCount: 1, isDeclaredOffSpec: false },
  { id: 64, name: 'Frost', itemCount: 3, isDeclaredOffSpec: true },
]);
const BLAZE = entry(2, 'Blaze', [{ id: 63, name: 'Fire', itemCount: 2, isDeclaredOffSpec: false }]);

describe('withoutShownWishlist', () => {
  it('keeps the characters absent from the roster view', () => {
    expect(withoutShownWishlist([FROSTY, BLAZE], new Set([1]))).toEqual([BLAZE]);
  });

  it('returns nothing while the hidden wishlists are not loaded', () => {
    expect(withoutShownWishlist(undefined, new Set())).toEqual([]);
  });
});

describe('HiddenOnlyWishlistsAlert', () => {
  it('lists each character with the specs of his hidden wishlists', () => {
    render(
      <MantineProvider>
        <HiddenOnlyWishlistsAlert entries={[FROSTY]} />
      </MantineProvider>,
    );
    expect(screen.getByText('roster_hidden_only_title')).toBeTruthy();
    expect(screen.getByText('Frosty')).toBeTruthy();
    expect(
      screen.getByText((content) =>
        content.includes('Fire: 1, Frost: 3 (roster_hidden_spec_offspec)'),
      ),
    ).toBeTruthy();
  });

  it('renders nothing without hidden-only wishlist', () => {
    render(
      <MantineProvider>
        <HiddenOnlyWishlistsAlert entries={[]} />
      </MantineProvider>,
    );
    expect(screen.queryByText('roster_hidden_only_title')).toBeNull();
  });
});
