import { MantineProvider, Table } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { LootEquityItem } from 'services/attendance.service';

import { PlayerLootItemsRow } from './PlayerLootItemsRow';

// Le lien Wowhead lit la langue d'i18next, absente des tests.
vi.mock('components/domain/loot/WowheadLink', () => ({
  WowheadLink: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const item = (over: Partial<LootEquityItem> = {}): LootEquityItem => ({
  lootId: 1,
  itemId: 100,
  itemName: 'Ring of Equity',
  itemIcon: null,
  receivedAt: '2026-05-15T21:00:00.000Z',
  response: 'Upgrade',
  instance: 'Manaforge Omega-Heroic',
  gainPercent: 2.5,
  simulatedAt: '2026-05-14T00:00:00.000Z',
  gainSource: 'frozen',
  isBis: false,
  ...over,
});

const renderRow = (items: LootEquityItem[]) =>
  render(
    <MantineProvider>
      <Table>
        <Table.Tbody>
          <PlayerLootItemsRow items={items} colSpan={7} />
        </Table.Tbody>
      </Table>
    </MantineProvider>,
  );

describe('<PlayerLootItemsRow />', () => {
  it('shows the simulated gain of each item', () => {
    renderRow([item()]);
    expect(screen.getByText('Ring of Equity')).toBeInTheDocument();
    expect(screen.getByText('+2.50%')).toBeInTheDocument();
  });

  it('tells a gain frozen at import (SIMS-229)', async () => {
    renderRow([item()]);
    fireEvent.mouseEnter(screen.getByText('+2.50%'));
    expect(await screen.findByText('detail.gain_frozen')).toBeInTheDocument();
  });

  it('tells a gain estimated afterwards, for an older drop', async () => {
    renderRow([item({ gainSource: 'estimated' })]);
    fireEvent.mouseEnter(screen.getByText('+2.50%'));
    expect(await screen.findByText('detail.gain_estimated')).toBeInTheDocument();
  });

  it('says the gain is unknown without a sim, and flags a BiS item', () => {
    renderRow([item({ gainPercent: null, simulatedAt: null, gainSource: null, isBis: true })]);
    expect(screen.getByText('detail.unknown')).toBeInTheDocument();
    expect(screen.getByText('detail.bis')).toBeInTheDocument();
  });

  it('says when no item was received', () => {
    renderRow([]);
    expect(screen.getByText('detail.no_items')).toBeInTheDocument();
  });
});
