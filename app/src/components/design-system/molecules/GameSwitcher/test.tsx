import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WOW_EXTENSION } from 'config/seasonConfig';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import type { Realm } from 'types/realm';
import type { User } from 'types/user.types';

import {
  collectUserGuilds,
  LAST_GUILD_STORAGE_PREFIX,
  readLastGuild,
  rememberLastGuild,
  resolveGameDestination,
} from './gameDestination';
import { GameSwitcher } from './GameSwitcher';

const state = vi.hoisted(() => ({
  foreverEnabled: true,
  game: 'retail' as 'retail' | 'forever',
  guild: 'Ma Guilde' as string | undefined,
  user: { id: 42, linkedCharacters: [], guestRealms: [] } as unknown,
  checkedRealm: null as unknown,
  realms: [] as unknown[],
  listFails: false,
}));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => feature !== 'forever' || state.foreverEnabled,
}));

vi.mock('contexts', () => ({ useAuth: () => ({ user: state.user }) }));

vi.mock('hooks/queries', () => ({
  useUserRealm: () => ({ data: state.checkedRealm }),
  useFetchRealmList: () => async () => {
    if (state.listFails) throw new Error('network');
    return state.realms;
  },
}));

vi.mock('hooks/useGame', () => ({ useGame: () => ({ game: state.game }) }));

vi.mock('hooks/useRouteParams', () => ({ useRouteParams: () => ({ guild: state.guild }) }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { game?: string }) =>
      options?.game ? `${key}:${options.game}` : key,
  }),
}));

const realm = (id: number, guildName: string, game?: 'retail' | 'forever', createdBy = 1) =>
  ({ id, guildName, game, createdBy }) as Realm;

const user = (overrides: Partial<User> = {}): User => ({
  id: 42,
  linkedCharacters: [],
  guestRealms: [],
  ...overrides,
});

const Probe = () => {
  const location = useLocation();
  return <div data-testid="page">{decodeURIComponent(location.pathname + location.search)}</div>;
};

const renderSwitcher = () => {
  const router = createMemoryRouter(
    [
      {
        path: '/start',
        element: <GameSwitcher />,
      },
      { path: '*', element: <Probe /> },
    ],
    { initialEntries: ['/start'] },
  );
  render(
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
};

beforeEach(() => {
  window.localStorage.clear();
  state.foreverEnabled = true;
  state.game = 'retail';
  state.guild = 'Ma Guilde';
  state.user = user();
  state.checkedRealm = null;
  state.realms = [];
  state.listFails = false;
});

describe('mémorisation de la dernière guilde par jeu', () => {
  it('relit la guilde mémorisée pour chaque jeu séparément', () => {
    rememberLastGuild('retail', 'Ma Guilde');
    rememberLastGuild('forever', 'Les Éclaireurs');
    expect(readLastGuild('retail')).toBe('Ma Guilde');
    expect(readLastGuild('forever')).toBe('Les Éclaireurs');
    expect(window.localStorage.getItem(`${LAST_GUILD_STORAGE_PREFIX}forever`)).toBe(
      'Les Éclaireurs',
    );
  });

  it('ignore un localStorage indisponible', () => {
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => rememberLastGuild('retail', 'Ma Guilde')).not.toThrow();
    expect(readLastGuild('retail')).toBeNull();
    storage.mockRestore();
  });
});

describe('collectUserGuilds', () => {
  const realms = [
    realm(1, 'Ma Guilde', 'retail'),
    realm(2, 'Les Éclaireurs', 'forever', 42),
    realm(3, 'Invités', 'forever'),
    realm(4, 'Ancienne', undefined),
    realm(5, 'Étrangère', 'retail'),
  ];

  it('réunit guildes créées, guildes des personnages et invitations, avec leur jeu', () => {
    const guilds = collectUserGuilds(
      user({
        linkedCharacters: [
          { id: 1, name: 'A', class: 'mage', realm: 'x', guildName: 'ma guilde' },
          { id: 2, name: 'B', class: 'mage', realm: 'x', realmId: 4 },
        ],
        guestRealms: [{ id: 3, guildName: 'Invités', server: 's', region: 'eu', joinedAt: '' }],
      }),
      realms,
    );
    expect(guilds).toEqual([
      { guildName: 'Les Éclaireurs', game: 'forever' },
      { guildName: 'Ma Guilde', game: 'retail' },
      { guildName: 'Ancienne', game: 'retail' },
      { guildName: 'Invités', game: 'forever' },
    ]);
  });

  it('place en tête la guilde renvoyée par /realms/check', () => {
    const guilds = collectUserGuilds(user(), realms, realm(5, 'Étrangère', 'retail'));
    expect(guilds[0]).toEqual({ guildName: 'Étrangère', game: 'retail' });
  });

  it('ne renvoie rien sans utilisateur', () => {
    expect(collectUserGuilds(null, realms)).toEqual([]);
  });
});

describe('resolveGameDestination', () => {
  const guilds = [
    { guildName: 'Ma Guilde', game: 'retail' as const },
    { guildName: 'Les Éclaireurs', game: 'forever' as const },
    { guildName: 'Les Gardiens', game: 'forever' as const },
  ];

  it('mène à la dernière guilde visitée dans ce jeu', () => {
    expect(resolveGameDestination('forever', 'Les Gardiens', guilds)).toBe(
      '/Les%20Gardiens/Forever/my-activity',
    );
  });

  it('ignore une guilde mémorisée qui n’est plus celle de l’utilisateur', () => {
    expect(resolveGameDestination('forever', 'Partie', guilds)).toBe(
      '/Les%20%C3%89claireurs/Forever/my-activity',
    );
  });

  it('mène à une guilde du jeu sans guilde mémorisée', () => {
    expect(resolveGameDestination('retail', null, guilds)).toBe(
      `/Ma%20Guilde/${WOW_EXTENSION}/my-activity`,
    );
  });

  it('propose la création d’une guilde du jeu quand l’utilisateur n’en a pas', () => {
    expect(resolveGameDestination('forever', null, [guilds[0]])).toBe('/create-realm?game=forever');
    expect(resolveGameDestination('retail', null, [])).toBe('/create-realm');
  });

  it('se rabat sur la guilde mémorisée si la liste des guildes est indisponible', () => {
    expect(resolveGameDestination('forever', 'Les Gardiens', null)).toBe(
      '/Les%20Gardiens/Forever/my-activity',
    );
    expect(resolveGameDestination('forever', null, null)).toBe('/create-realm?game=forever');
  });
});

describe('<GameSwitcher />', () => {
  it('affiche le logo seul, qui ramène à l’accueil de la guilde, sans le flag « forever »', async () => {
    state.foreverEnabled = false;
    renderSwitcher();

    expect(screen.queryByText('common:games.retail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common:game_switcher.home' }));
    expect(await screen.findByTestId('page')).toHaveTextContent(
      `/Ma Guilde/${WOW_EXTENSION}/my-activity`,
    );
  });

  it('affiche le jeu courant et propose Retail et Forever avec le flag', async () => {
    renderSwitcher();

    const trigger = screen.getByRole('button', {
      name: 'common:game_switcher.label:common:games.retail',
    });
    expect(screen.getByText('common:games.retail')).toBeInTheDocument();
    fireEvent.click(trigger);

    expect(
      await screen.findByRole('menuitem', { name: 'common:games.forever', hidden: true }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('menuitem', { name: 'common:games.retail', hidden: true }),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('mémorise la guilde courante pour le jeu courant', () => {
    state.game = 'forever';
    state.guild = 'Les Éclaireurs';
    renderSwitcher();
    expect(readLastGuild('forever')).toBe('Les Éclaireurs');
  });

  it('choisir Forever mène à la guilde Forever de l’utilisateur', async () => {
    state.realms = [realm(1, 'Ma Guilde', 'retail', 42), realm(2, 'Les Éclaireurs', 'forever', 42)];
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /game_switcher\.label/ }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'common:games.forever', hidden: true }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('page')).toHaveTextContent('/Les Éclaireurs/Forever/my-activity'),
    );
  });

  it('choisir Forever sans guilde Forever mène à la création', async () => {
    state.realms = [realm(1, 'Ma Guilde', 'retail', 42)];
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /game_switcher\.label/ }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'common:games.forever', hidden: true }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('page')).toHaveTextContent('/create-realm?game=forever'),
    );
  });

  it('se rabat sur la guilde mémorisée si la liste des guildes échoue', async () => {
    state.listFails = true;
    rememberLastGuild('forever', 'Les Gardiens');
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: /game_switcher\.label/ }));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'common:games.forever', hidden: true }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('page')).toHaveTextContent('/Les Gardiens/Forever/my-activity'),
    );
  });
});
