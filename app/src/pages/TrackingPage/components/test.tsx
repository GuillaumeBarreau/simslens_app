import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import type { TrackingView } from '../trackingStatus';
import { TrackingTable } from './TrackingTable';
import type { Character, TrackingTableRowProps } from './TrackingTableRow';

const flags = vi.hoisted(() => ({ simFreshness: false }));
const currentGame = vi.hoisted(() => ({ id: 'retail' as 'retail' | 'forever' }));
const rowProps = vi.hoisted(() => [] as TrackingTableRowProps[]);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => (feature === 'sim-freshness' ? flags.simFreshness : true),
}));

vi.mock('hooks/useGame', async () => {
  const { gameHasCapability } = await import('config/games');
  return {
    useGame: () => ({
      game: currentGame.id,
      has: (capability: Parameters<typeof gameHasCapability>[1]) =>
        gameHasCapability(currentGame.id, capability),
    }),
  };
});

// La ligne réelle tire le bouton Droptimizer, l'équipement et le routeur : on ne
// vérifie ici que ce que le tableau lui transmet.
vi.mock('./TrackingTableRow', () => ({
  TrackingTableRow: (props: TrackingTableRowProps) => {
    rowProps.push(props);
    return (
      <tr>
        <td>{props.character.name}</td>
      </tr>
    );
  },
}));

const character = {
  id: 1,
  name: 'Simmeuse',
  class: 'Mage',
  realm: 'Hyjal',
  ilvl: 650,
  currentPeriodKeyCount: 0,
  score: 0,
  recentReportId: 'abc',
  recentReportTimestamp: Date.now(),
} satisfies Character;

const renderTable = (view: TrackingView = 'overview') =>
  render(
    <MantineProvider>
      <TrackingTable
        sortedRoster={[character]}
        view={view}
        showGear={false}
        handleSort={vi.fn()}
        sortKey="ilvl"
        sortDir="desc"
        difficulty="mythic"
        lootsByCharacter={{}}
        staleAfterDays={12}
      />
    </MantineProvider>,
  );

beforeEach(() => {
  rowProps.length = 0;
  flags.simFreshness = false;
  currentGame.id = 'retail';
});

describe('<TrackingTable /> — fraîcheur des sims (SIMS-199)', () => {
  it('masque la colonne « Dernier sim » tant que le drapeau est fermé', () => {
    renderTable();
    expect(screen.queryByText('sim_freshness.column')).toBeNull();
    expect(rowProps.at(-1)).toMatchObject({ showSimDate: false });
  });

  it('affiche la colonne drapeau ouvert', () => {
    flags.simFreshness = true;
    renderTable();
    expect(screen.getByText('sim_freshness.column')).toBeInTheDocument();
    expect(rowProps.at(-1)).toMatchObject({ showSimDate: true });
  });

  it('réserve « Dernier sim » à la vue d’ensemble : un mode porte l’âge dans son état', () => {
    flags.simFreshness = true;
    renderTable('heroic');
    expect(screen.queryByText('sim_freshness.column')).toBeNull();
    expect(screen.getByText(/table.state_mode/)).toBeInTheDocument();
    expect(rowProps.at(-1)).toMatchObject({ showSimDate: true, view: 'heroic' });
  });

  it('transmet le seuil de la guilde à chaque ligne', () => {
    renderTable();
    expect(rowProps.at(-1)).toMatchObject({ staleAfterDays: 12, character });
  });
});

describe('<TrackingTable /> — colonnes par jeu (SIMS-022)', () => {
  it('affiche clés, score et état des sims pour Retail', () => {
    flags.simFreshness = true;
    renderTable();
    expect(screen.getByText(/table.key/)).toBeInTheDocument();
    expect(screen.getByText(/table.score/)).toBeInTheDocument();
    expect(screen.getByText(/table.modes/)).toBeInTheDocument();
    expect(screen.getByText('sim_freshness.column')).toBeInTheDocument();
    expect(rowProps.at(-1)).toMatchObject({
      showMythicPlus: true,
      showSims: true,
      showSimDate: true,
      columnCount: 8,
    });
  });

  it('masque clés, score, état et date des sims pour Forever', () => {
    flags.simFreshness = true;
    currentGame.id = 'forever';
    renderTable();
    expect(screen.queryByText(/table.key/)).toBeNull();
    expect(screen.queryByText(/table.score/)).toBeNull();
    expect(screen.queryByText(/table.modes/)).toBeNull();
    expect(screen.queryByText('sim_freshness.column')).toBeNull();
    expect(screen.getByText(/table.name/)).toBeInTheDocument();
    expect(rowProps.at(-1)).toMatchObject({
      showMythicPlus: false,
      showSims: false,
      showSimDate: false,
      columnCount: 4,
    });
  });
});
