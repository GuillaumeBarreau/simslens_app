import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';

import RealmRedirect from './RealmRedirect';

const state = vi.hoisted(() => ({
  user: { id: 42, linkedCharacters: [] as { guildName?: string }[], guestRealms: [] },
  realm: null as { guildName: string; game?: string } | null,
  foreverEnabled: true,
}));

vi.mock('contexts', () => ({
  useAuth: () => ({ user: state.user, isLoading: false, lastVisitedRealm: null }),
}));

vi.mock('hooks/queries', () => ({
  useUserRealm: () => ({ data: state.realm, isLoading: false }),
}));

vi.mock('config/seasonConfig', () => ({
  WOW_EXTENSION: 'Midnight',
  isValidExtension: (extension?: string | null) =>
    extension === 'Midnight' || (extension === 'Forever' && state.foreverEnabled),
}));

const Probe = () => {
  const location = useLocation();
  return <div data-testid="page">{decodeURIComponent(location.pathname)}</div>;
};

const renderRedirect = () => {
  const router = createMemoryRouter(
    [
      { path: '/redirect', element: <RealmRedirect /> },
      { path: '*', element: <Probe /> },
    ],
    { initialEntries: ['/redirect'] },
  );
  render(
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
};

beforeEach(() => {
  state.user = { id: 42, linkedCharacters: [], guestRealms: [] };
  state.realm = null;
  state.foreverEnabled = true;
});

describe('<RealmRedirect />', () => {
  it('ouvre une guilde Forever sous l’extension Forever, sans passer par /sync', async () => {
    state.realm = { guildName: 'Les Éclaireurs', game: 'forever' };
    renderRedirect();
    expect(await screen.findByTestId('page')).toHaveTextContent(
      '/Les Éclaireurs/Forever/my-activity',
    );
  });

  it('garde l’extension Retail pour une guilde Retail', async () => {
    state.realm = { guildName: 'Ma Guilde', game: 'retail' };
    state.user.linkedCharacters = [{ guildName: 'Ma Guilde' }];
    renderRedirect();
    expect(await screen.findByTestId('page')).toHaveTextContent('/Ma Guilde/Midnight/my-activity');
  });

  it('envoie le propriétaire d’une guilde Retail sans personnage vers /sync', async () => {
    state.realm = { guildName: 'Ma Guilde' };
    renderRedirect();
    expect(await screen.findByTestId('page')).toHaveTextContent('/sync');
  });

  it('retombe sur l’extension Retail quand le flag « forever » est coupé', async () => {
    state.foreverEnabled = false;
    state.realm = { guildName: 'Les Éclaireurs', game: 'forever' };
    renderRedirect();
    expect(await screen.findByTestId('page')).toHaveTextContent(
      '/Les Éclaireurs/Midnight/my-activity',
    );
  });
});
