import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AttunementDefinition, CharacterAttunements } from 'services/attunement.service';

import AttunementsPage from './AttunementsPage';

const mutate = vi.hoisted(() => vi.fn());

const definition: AttunementDefinition = {
  key: 'drakefire_amulet',
  raid: "Onyxia's Lair",
  itemId: 16309,
  chains: {
    alliance: [{ questId: 4182, name: 'Dragonkin Menace' }],
    horde: [
      { questId: 4903, name: "Warlord's Command" },
      { questId: 4941, name: "Eitrigg's Wisdom" },
      { questId: 4974, name: 'For The Horde!' },
    ],
  },
};

const status = (completedSteps: number, faction: 'horde' | null = 'horde') => [
  {
    attunement: 'drakefire_amulet',
    faction,
    completedSteps,
    totalSteps: faction ? 3 : null,
    completed: completedSteps === 3,
    nextStep: null,
  },
];

const roster: CharacterAttunements[] = [
  { characterId: 1, name: 'Thrall', class: 'shaman', attunements: status(1) },
  { characterId: 2, name: 'Rexxar', class: 'hunter', attunements: status(3) },
  { characterId: 3, name: 'Jaina', class: 'mage', attunements: status(0, null) },
];

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(',')}` : key,
  }),
}));

vi.mock('contexts', () => ({ useAuth: () => ({ user: { id: 42 } }) }));

vi.mock('hooks/useGame', () => ({
  useGame: () => ({ definition: { wowheadBaseUrl: 'https://www.wowhead.com/forever/' } }),
}));

vi.mock('hooks/queries', () => ({
  useUserRealm: () => ({ data: { id: 7 } }),
  useAttunementDefinitions: () => ({ data: [definition], isLoading: false }),
  useRealmAttunements: () => ({ data: roster, isLoading: false }),
  // Seuls Thrall et Jaina appartiennent au joueur connecté.
  useCharacters: () => ({
    data: [
      { id: 1, userId: '42' },
      { id: 2, userId: '99' },
      { id: 3, userId: '42' },
    ],
  }),
  useSaveAttunement: () => ({ mutate, isPending: false }),
}));

const renderPage = () =>
  render(
    <MantineProvider>
      <AttunementsPage />
    </MantineProvider>,
  );

beforeEach(() => mutate.mockClear());

describe('<AttunementsPage />', () => {
  it('affiche les personnages du joueur et le roster trié, avec le compteur de prêts', () => {
    renderPage();

    expect(screen.getAllByText(/^status\./)).toHaveLength(2);
    expect(screen.getByText("roster.ready_count:1,3,Onyxia's Lair")).toBeInTheDocument();

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      'Rexxar',
      'Thrall',
      'Jaina',
    ]);
    expect(within(rows[1]).getByText('1 / 3')).toBeInTheDocument();
  });

  it('lie chaque quête à Wowhead Forever et enregistre la quête cochée', () => {
    renderPage();

    const link = screen.getByRole('link', { name: '3. For The Horde!' });
    expect(link).toHaveAttribute('href', 'https://www.wowhead.com/forever/quest=4974');

    fireEvent.click(screen.getAllByRole('checkbox')[2]);
    expect(mutate).toHaveBeenCalledWith(
      { characterId: 1, attunement: 'drakefire_amulet', faction: 'horde', completedSteps: 3 },
      expect.anything(),
    );
  });

  it('enregistre la faction choisie, avancement remis à zéro', () => {
    renderPage();

    // Jaina n'a pas encore de faction : seconde carte.
    fireEvent.click(screen.getAllByRole('radio', { name: 'faction.alliance' })[1]);
    expect(mutate).toHaveBeenCalledWith(
      { characterId: 3, attunement: 'drakefire_amulet', faction: 'alliance', completedSteps: 0 },
      expect.anything(),
    );
  });
});
