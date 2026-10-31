import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import App from './App';

// Clerk is mocked: no remote script, no network call, no VITE_CLERK_* key needed.
// getToken keeps a stable identity, as in Clerk, because the data hooks depend on it.
const getToken = vi.hoisted(() => () => Promise.resolve('test-token'));

vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedIn: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  SignIn: () => <div data-testid="clerk-sign-in" />,
  useAuth: () => ({ getToken }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

const stats = {
  totalRealms: 3,
  totalCharacters: 42,
  active: 30,
  pending: 7,
  archived: 5,
  byRole: { tank: 4, healer: 6, dps: 20 },
  byClass: { Paladin: 8, Mage: 5 },
  avgIlvl: 639,
};

describe('<App />', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render the signed-in layout with the sidebar and the dashboard stats', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(stats), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.queryByTestId('clerk-sign-in')).not.toBeInTheDocument();
    expect(screen.getByText('WoW Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guildes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Déconnexion/ })).toBeInTheDocument();

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Personnages actifs')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Paladin')).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/stats',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      }),
    );
  });
});
