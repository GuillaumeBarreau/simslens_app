import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { DifficultyProvider, useDifficulty } from 'contexts/DifficultyContext';
import { useGame } from 'hooks/useGame';
import { useRouteParams } from 'hooks/useRouteParams';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import DifficultySelector from './domain/roster/DifficultySelector/DifficultySelector';
import { GameCapabilityGuard } from './GameCapabilityGuard';
import RequireExtension from './RequireExtension';
import RequireGameCapability from './RequireGameCapability';

const flags = vi.hoisted(() => ({ forever: true }));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => (feature === 'forever' ? flags.forever : true),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const GameProbe = () => {
  const { game, definition, has } = useGame();
  const { season } = useRouteParams();
  return (
    <div data-testid="probe">
      {`${game} ${definition.id} ${season} droptimizer=${has('droptimizer')} softReserve=${has('softReserve')}`}
    </div>
  );
};

const renderAt = (url: string, element: ReactNode) => {
  const router = createMemoryRouter(
    [
      {
        path: ':guild/:extension',
        element: <RequireExtension />,
        children: [{ path: '*', element }],
      },
    ],
    { initialEntries: [url] },
  );
  render(
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
};

afterEach(() => {
  flags.forever = true;
  localStorage.clear();
});

describe('useGame', () => {
  it('résout Forever depuis l’extension de l’URL, saison tier-1 par défaut', () => {
    renderAt('/Guilde/Forever/my-activity', <GameProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent(
      'forever forever tier-1 droptimizer=false softReserve=true',
    );
  });

  it('ramène une saison Retail vers tier-1 sous Forever', () => {
    localStorage.setItem('wow_selected_season', 'season-02');
    renderAt('/Guilde/Forever/my-activity', <GameProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('tier-1');
  });

  it('reste Retail pour une extension Retail', () => {
    renderAt('/Guilde/Midnight/my-activity', <GameProbe />);
    expect(screen.getByTestId('probe')).toHaveTextContent(
      /^retail retail season-0\d droptimizer=true softReserve=false$/,
    );
  });
});

describe('<GameCapabilityGuard />', () => {
  it('affiche ses enfants quand le jeu a la capacité', () => {
    renderAt(
      '/Guilde/Forever/x',
      <GameCapabilityGuard capability="softReserve">
        <span>contenu</span>
      </GameCapabilityGuard>,
    );
    expect(screen.getByText('contenu')).toBeInTheDocument();
  });

  it('n’affiche rien par défaut quand le jeu n’a pas la capacité', () => {
    renderAt(
      '/Guilde/Forever/x',
      <div data-testid="wrapper">
        <GameCapabilityGuard capability="droptimizer">
          <span>contenu</span>
        </GameCapabilityGuard>
      </div>,
    );
    expect(screen.queryByText('contenu')).toBeNull();
    expect(screen.getByTestId('wrapper')).toBeEmptyDOMElement();
  });

  it('affiche le fallback quand le jeu n’a pas la capacité', () => {
    renderAt(
      '/Guilde/Midnight/x',
      <GameCapabilityGuard capability="softReserve" fallback={<span>indisponible</span>}>
        <span>contenu</span>
      </GameCapabilityGuard>,
    );
    expect(screen.getByText('indisponible')).toBeInTheDocument();
    expect(screen.queryByText('contenu')).toBeNull();
  });
});

describe('<RequireExtension />', () => {
  const page = <span>page</span>;

  it('ouvre une extension Retail', () => {
    renderAt('/Guilde/Midnight/x', page);
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('ouvre Forever quand le flag est actif', () => {
    renderAt('/Guilde/Forever/x', page);
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('affiche le 404 pour Forever quand le flag est inactif', () => {
    flags.forever = false;
    renderAt('/Guilde/Forever/x', page);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.queryByText('page')).toBeNull();
  });

  it('affiche le 404 pour une extension inconnue', () => {
    renderAt('/Guilde/Inconnue/x', page);
    expect(screen.getByText('404')).toBeInTheDocument();
  });
});

describe('<RequireGameCapability /> (SIMS-022)', () => {
  const renderRoutes = (url: string) => {
    const router = createMemoryRouter(
      [
        {
          path: ':guild/:extension',
          children: [
            { path: 'my-activity', element: <span>mon activité</span> },
            {
              path: 'keys-history',
              element: (
                <RequireGameCapability capability="mythicPlus">
                  <span>historique</span>
                </RequireGameCapability>
              ),
            },
            {
              path: 'dungeons',
              element: <RequireGameCapability capability="mythicPlus" />,
              children: [{ index: true, element: <span>donjons</span> }],
            },
          ],
        },
      ],
      { initialEntries: [url] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };

  it('ouvre la page quand le jeu a la capacité (Retail)', () => {
    renderRoutes('/Guilde/Midnight/keys-history');
    expect(screen.getByText('historique')).toBeInTheDocument();
  });

  it('renvoie vers « Mon activité » de la même guilde sous Forever', () => {
    const router = renderRoutes('/Guilde/Forever/keys-history');
    expect(screen.getByText('mon activité')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/Guilde/Forever/my-activity');
  });

  it('protège aussi les routes filles (donjons)', () => {
    renderRoutes('/Guilde/Midnight/dungeons');
    expect(screen.getByText('donjons')).toBeInTheDocument();
  });

  it('redirige les routes filles sous Forever', () => {
    renderRoutes('/Guilde/Forever/dungeons');
    expect(screen.getByText('mon activité')).toBeInTheDocument();
  });
});

describe('difficulté par jeu (SIMS-022)', () => {
  const DifficultyProbe = () => {
    const { difficulty, setDifficulty, canSelectDifficulty } = useDifficulty();
    return (
      <>
        <div data-testid="difficulty">{`${difficulty} selectable=${canSelectDifficulty}`}</div>
        <DifficultySelector difficulty={difficulty} setDifficulty={setDifficulty} />
      </>
    );
  };

  const renderProbe = (url: string) =>
    renderAt(
      url,
      <DifficultyProvider>
        <DifficultyProbe />
      </DifficultyProvider>,
    );

  it('garde « mythic » par défaut et le sélecteur à trois choix pour Retail', () => {
    renderProbe('/Guilde/Midnight/x');
    expect(screen.getByTestId('difficulty')).toHaveTextContent('mythic selectable=true');
    expect(screen.getByText('difficulties.mythic')).toBeInTheDocument();
    expect(screen.getByText('difficulties.heroic')).toBeInTheDocument();
    expect(screen.getByText('difficulties.normal')).toBeInTheDocument();
  });

  it('impose « normal » et masque le sélecteur pour Forever', () => {
    renderProbe('/Guilde/Forever/x');
    expect(screen.getByTestId('difficulty')).toHaveTextContent('normal selectable=false');
    expect(screen.queryByText('difficulties.normal')).toBeNull();
    expect(screen.queryByText('difficulties.mythic')).toBeNull();
  });
});
