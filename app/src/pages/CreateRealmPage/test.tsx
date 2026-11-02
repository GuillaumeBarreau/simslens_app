import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { apiClient } from 'services/api.client';

import { createRealmErrorKey, resolveCreateRealmGame } from './createRealm.utils';
import CreateRealmPage from './CreateRealmPage';

const state = vi.hoisted(() => ({ foreverEnabled: true }));

vi.mock('contexts', () => ({ useAuth: () => ({ user: { id: 42 } }) }));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => feature !== 'forever' || state.foreverEnabled,
}));

vi.mock('config/seasonConfig', () => ({
  WOW_EXTENSION: 'Midnight',
  isValidExtension: (extension?: string | null) =>
    extension === 'Midnight' || (extension === 'Forever' && state.foreverEnabled),
}));

vi.mock('@mantine/notifications', () => ({ notifications: { show: vi.fn() } }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type Reply = { status: number; data: unknown };
let replies: Record<string, Reply>;
let requests: { method?: string; url?: string; params?: unknown; data?: unknown }[];

const FOREVER_REGIONS = [
  {
    id: 1,
    name: 'EU',
    servers: [
      { id: 10, name: 'Forever PvE', slug: 'forever-pve' },
      { id: 11, name: 'Forever PvP', slug: 'forever-pvp' },
    ],
  },
];
const RETAIL_REGIONS = [{ id: 1, name: 'EU', servers: [{ id: 1, name: 'Hyjal', slug: 'hyjal' }] }];

beforeEach(() => {
  state.foreverEnabled = true;
  requests = [];
  replies = {
    'get /1/regions': { status: 200, data: FOREVER_REGIONS },
    'post /1/realms': {
      status: 201,
      data: { id: 7, name: 'Les Éclaireurs', server: 'forever-pvp', region: 'EU', game: 'forever' },
    },
  };
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    requests.push({
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data ? JSON.parse(config.data) : undefined,
    });
    const isRetail = config.params?.game === 'retail';
    const key = `${config.method} ${config.url}`;
    const reply =
      key === 'get /1/regions' && isRetail
        ? { status: 200, data: RETAIL_REGIONS }
        : (replies[key] ?? { status: 500, data: {} });
    const response = { ...reply, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) {
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, null, response);
    }
    return response;
  };
});

const Probe = () => {
  const location = useLocation();
  return <div data-testid="page">{decodeURIComponent(location.pathname)}</div>;
};

const renderAt = (url: string) => {
  const router = createMemoryRouter(
    [
      { path: '/create-realm', element: <CreateRealmPage /> },
      { path: '*', element: <Probe /> },
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
};

const pickRegion = async (name: string) => {
  fireEvent.click(screen.getByRole('textbox', { name: /form.region/ }));
  // Le menu déroulant de Mantine reste « caché » pendant sa transition sous happy-dom.
  fireEvent.click(await screen.findByRole('option', { name, hidden: true }));
};

const fillForeverForm = async () => {
  fireEvent.change(screen.getByRole('textbox', { name: /form.guild_name/ }), {
    target: { value: 'Les Éclaireurs' },
  });
  await pickRegion('EU');
  fireEvent.click(await screen.findByRole('radio', { name: 'form.mode_pvp' }));
  fireEvent.click(screen.getByRole('button', { name: 'form.create_btn' }));
};

describe('<CreateRealmPage /> ?game=forever', () => {
  it('liste les régions Forever et propose PvE / PvP au lieu des serveurs', async () => {
    renderAt('/create-realm?game=forever');

    expect(await screen.findByText('forever.title')).toBeInTheDocument();
    await waitFor(() =>
      expect(requests).toContainEqual(
        expect.objectContaining({ url: '/1/regions', params: { game: 'forever' } }),
      ),
    );
    expect(screen.queryByRole('textbox', { name: /form.server/ })).toBeNull();

    await pickRegion('EU');
    expect(await screen.findByRole('radio', { name: 'form.mode_pve' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'form.mode_pvp' })).toBeInTheDocument();
  });

  it('crée la guilde sur le serveur choisi et ouvre son accueil Forever', async () => {
    renderAt('/create-realm?game=forever');
    await screen.findByText('forever.title');
    await fillForeverForm();

    expect(await screen.findByTestId('page')).toHaveTextContent(
      '/Les Éclaireurs/Forever/my-activity',
    );
    expect(requests).toContainEqual(
      expect.objectContaining({
        method: 'post',
        url: '/1/realms',
        data: { name: 'Les Éclaireurs', server: 'forever-pvp', region: 'EU', ownerId: 42 },
      }),
    );
  });

  it('explique le 409 « guilde Forever déjà possédée »', async () => {
    replies['post /1/realms'] = {
      status: 409,
      data: { error: 'server_error', message: 'You already own a Forever realm' },
    };
    renderAt('/create-realm?game=forever');
    await screen.findByText('forever.title');
    await fillForeverForm();

    expect(await screen.findByText('errors.forever_already_owned')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).toBeNull();
  });

  it('garde le formulaire Retail quand le flag « forever » est coupé', async () => {
    state.foreverEnabled = false;
    renderAt('/create-realm?game=forever');

    expect(await screen.findByText('title')).toBeInTheDocument();
    await waitFor(() =>
      expect(requests).toContainEqual(
        expect.objectContaining({ url: '/1/regions', params: { game: 'retail' } }),
      ),
    );
    expect(screen.getByRole('textbox', { name: /form.server/ })).toBeInTheDocument();
  });
});

describe('createRealm.utils', () => {
  it('ne retient Forever que si le flag est actif', () => {
    expect(resolveCreateRealmGame('forever', true)).toBe('forever');
    expect(resolveCreateRealmGame('forever', false)).toBe('retail');
    expect(resolveCreateRealmGame(null, true)).toBe('retail');
    expect(resolveCreateRealmGame('classic', true)).toBe('retail');
  });

  it('traduit les 409 connus et laisse les autres erreurs', () => {
    const conflict = (message: string) => {
      const error = { message };
      Object.defineProperty(error, 'httpStatus', { value: 409 });
      return error;
    };
    expect(createRealmErrorKey(conflict('You already own a Forever realm'))).toBe(
      'errors.forever_already_owned',
    );
    expect(createRealmErrorKey(conflict('Realm already exists'))).toBe(
      'errors.realm_already_exists',
    );
    expect(createRealmErrorKey(conflict('Autre'))).toBeNull();
    expect(createRealmErrorKey({ message: 'You already own a Forever realm' })).toBeNull();
    expect(createRealmErrorKey(null)).toBeNull();
  });
});
