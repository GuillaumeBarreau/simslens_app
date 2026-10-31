import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { apiClient } from 'services/api.client';

import { isSameGuild, pathInGuild } from './realmPath';
import RequireRealm from './RequireRealm';

const auth = vi.hoisted(() => ({
  user: { id: 42 } as { id: number } | null,
  isLoading: false,
  logout: vi.fn(),
  refetchUser: vi.fn(),
}));

vi.mock('contexts', () => ({ useAuth: () => auth }));

vi.mock('config/seasonConfig', () => ({
  WOW_EXTENSION: 'Midnight',
  VALID_EXTENSIONS: ['The-War-Within', 'Midnight'],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type Reply = { status: number; data: unknown };
let routes: Record<string, Reply | (() => Reply)>;
let sentHeaders: Record<string, unknown>[];

const REALM = {
  id: 6,
  guildName: 'Les Éclaireurs',
  name: 'x',
  slug: 'x',
  region: 'eu',
  server: 'x',
};
const PERMS = { role: 'member', permissions: {} };

beforeEach(() => {
  auth.user = { id: 42 };
  auth.logout.mockReset();
  auth.refetchUser.mockReset().mockResolvedValue(undefined);
  sentHeaders = [];
  routes = {
    '/1/realms/check': { status: 200, data: REALM },
    '/1/realms/6/my-permissions': { status: 200, data: PERMS },
  };
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sentHeaders.push({ ...config.headers });
    const route = routes[config.url ?? ''];
    const reply = typeof route === 'function' ? route() : (route ?? { status: 500, data: {} });
    const response = { ...reply, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) {
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
});

const Probe = ({ label }: { label: string }) => {
  const location = useLocation();
  return (
    <div data-testid="page">{`${label} ${decodeURIComponent(location.pathname)}${location.search}`}</div>
  );
};

const renderAt = (url: string) => {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <Probe label="login" /> },
      { path: '/sync', element: <Probe label="sync" /> },
      { path: '/redirect', element: <Probe label="redirect" /> },
      {
        path: ':guild',
        element: <RequireRealm />,
        children: [{ path: '*', element: <Probe label="guild" /> }],
      },
    ],
    { initialEntries: [url] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return router;
};

const page = () => screen.findByTestId('page');

describe('<RequireRealm />', () => {
  it('ouvre la page demandée dans la guilde du compte', async () => {
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');
    expect(await page()).toHaveTextContent('guild /Les Éclaireurs/Midnight/roster');
  });

  it('ouvre la page quand l’URL écrit la guilde dans une autre casse', async () => {
    renderAt('/les%20%C3%A9claireurs/Midnight/roster');
    expect(await page()).toHaveTextContent('guild /les éclaireurs/Midnight/roster');
  });

  it('redirige une autre guilde vers la même page de la sienne', async () => {
    const router = renderAt('/Autre%20Guilde/Midnight/roster?characterId=3');
    expect(await page()).toHaveTextContent('guild /Les Éclaireurs/Midnight/roster?characterId=3');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(screen.queryByText('404')).toBeNull();
  });

  it('redirige vers l’accueil de sa guilde quand le reste du chemin est invalide', async () => {
    renderAt('/Autre%20Guilde/Inconnue/roster');
    expect(await page()).toHaveTextContent('guild /Les Éclaireurs/Midnight/my-activity');
  });

  it('affiche le 404 quand /realms/check répond { realm: null }', async () => {
    routes['/1/realms/check'] = { status: 200, data: { realm: null } };
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');
    expect(await screen.findByText('404')).toBeInTheDocument();
    expect(screen.getByText('error.realm_not_found.title')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common:navigation.logout'));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('traite le 404 de /realms/check comme une absence de royaume', async () => {
    routes['/1/realms/check'] = { status: 404, data: { error: 'Realm not found for this user' } };
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');
    expect(await screen.findByText('error.realm_not_found.title')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common:navigation.sync_characters'));
    expect(await page()).toHaveTextContent('sync /sync');
  });

  it('recharge la session sur un 401 des permissions, puis renvoie vers /login', async () => {
    routes['/1/realms/6/my-permissions'] = { status: 401, data: { error: 'Unauthorized' } };
    auth.refetchUser.mockImplementation(async () => {
      auth.user = null;
    });
    window.history.pushState({}, '', '/Les%20%C3%89claireurs/Midnight/roster');
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');

    await waitFor(() => expect(auth.refetchUser).toHaveBeenCalledTimes(1));
    expect(await page()).toHaveTextContent('login /login');
    expect(localStorage.getItem('auth_redirect')).toBe('/Les%20%C3%89claireurs/Midnight/roster');

    localStorage.removeItem('auth_redirect');
    window.history.pushState({}, '', '/');
  });

  it('propose de réessayer sur une autre erreur des permissions, sans 404', async () => {
    let calls = 0;
    routes['/1/realms/6/my-permissions'] = () =>
      ++calls === 1 ? { status: 500, data: { error: 'boom' } } : { status: 200, data: PERMS };
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');

    expect(await screen.findByText('error.realm_load_error.message')).toBeInTheDocument();
    expect(screen.queryByText('404')).toBeNull();
    expect(auth.refetchUser).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('error.realm_load_error.retry'));
    expect(await page()).toHaveTextContent('guild /Les Éclaireurs/Midnight/roster');
  });

  it('propose de réessayer quand /realms/check échoue autrement qu’en 404', async () => {
    routes['/1/realms/check'] = { status: 503, data: {} };
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');

    expect(await screen.findByText('error.realm_load_error.retry')).toBeInTheDocument();
    expect(screen.queryByText('404')).toBeNull();
  });

  it('« Retour à l’accueil » mène à sa guilde sans déconnecter', async () => {
    routes['/1/realms/6/my-permissions'] = { status: 500, data: {} };
    const router = renderAt('/Les%20%C3%89claireurs/Midnight/roster');

    fireEvent.click(await screen.findByText('error.realm_load_error.go_home'));
    await waitFor(() =>
      expect(decodeURIComponent(router.state.location.pathname)).toBe(
        '/Les Éclaireurs/Midnight/my-activity',
      ),
    );
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('n’envoie plus d’en-tête X-Realm-Id, même avec une ancienne clé current_realm_id', async () => {
    localStorage.setItem('current_realm_id', '999');
    renderAt('/Les%20%C3%89claireurs/Midnight/roster');
    await page();

    expect(sentHeaders.length).toBeGreaterThan(0);
    for (const headers of sentHeaders) {
      expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-realm-id');
    }
    localStorage.removeItem('current_realm_id');
  });
});

describe('api.client', () => {
  it('supprime au chargement la clé périmée current_realm_id', async () => {
    localStorage.setItem('current_realm_id', '999');
    vi.resetModules();
    await import('services/api.client');
    expect(localStorage.getItem('current_realm_id')).toBeNull();
  });
});

describe('realmPath', () => {
  it('compare les guildes sans tenir compte de la casse ni de l’encodage', () => {
    expect(isSameGuild('les%20%C3%A9claireurs', 'Les Éclaireurs')).toBe(true);
    expect(isSameGuild('LES ÉCLAIREURS', 'Les Éclaireurs')).toBe(true);
    expect(isSameGuild('Autre', 'Les Éclaireurs')).toBe(false);
    expect(isSameGuild('%E0%A4%A', 'x')).toBe(false);
  });

  it('conserve le chemin, la requête et l’ancre dans la guilde cible', () => {
    expect(
      pathInGuild(
        { pathname: '/Autre/The-War-Within/raid', search: '?a=1', hash: '#b' },
        'Ma Guilde',
      ),
    ).toBe('/Ma%20Guilde/The-War-Within/raid?a=1#b');
    expect(pathInGuild({ pathname: '/Autre' }, 'Ma Guilde')).toBe(
      '/Ma%20Guilde/Midnight/my-activity',
    );
  });
});
