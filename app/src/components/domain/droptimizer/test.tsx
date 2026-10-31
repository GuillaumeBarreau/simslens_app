import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';

import { SimFreshness } from './SimFreshness';
import { SimMetricBadge } from './SimMetricBadge';

const i18nState = vi.hoisted(() => ({ language: 'fr' }));
const flags = vi.hoisted(() => ({ hpsSims: true }));

vi.mock('config/featureFlags', () => ({
  isFeatureEnabled: (feature: string) => (feature === 'hps-sims' ? flags.hpsSims : true),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: i18nState.language, resolvedLanguage: i18nState.language },
  }),
}));

const DAY = 24 * 60 * 60 * 1000;

const dateIn = (locale: string, ts: number) =>
  new Date(ts).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

afterEach(() => {
  i18nState.language = 'fr';
  flags.hpsSims = true;
});

const renderFreshness = (timestamp: Parameters<typeof SimFreshness>[0]['timestamp'], days = 7) =>
  render(
    <MantineProvider>
      <SimFreshness timestamp={timestamp} staleAfterDays={days} />
    </MantineProvider>,
  );

describe('<SimFreshness />', () => {
  it('affiche la date du dernier sim sans badge tant qu’il est récent', () => {
    const ts = Date.now() - 2 * DAY;
    renderFreshness(ts);
    expect(screen.getByText(dateIn('fr', ts))).toBeInTheDocument();
    expect(screen.queryByText('sim_freshness.stale')).toBeNull();
  });

  it('formate la date dans la langue de l’interface', () => {
    i18nState.language = 'en';
    // 3 février : jour et mois se distinguent entre fr (03/02) et en (02/03).
    const ts = new Date(2026, 1, 3, 12).getTime();
    renderFreshness(ts, 10_000);
    expect(screen.getByText(dateIn('en', ts))).toBeInTheDocument();
    expect(screen.queryByText(dateIn('fr', ts))).toBeNull();
  });

  it('signale un sim plus vieux que le seuil de la guilde', () => {
    renderFreshness(new Date(Date.now() - 8 * DAY).toISOString());
    expect(screen.getByText('sim_freshness.stale')).toBeInTheDocument();
  });

  it('suit le seuil reçu plutôt que les 7 jours par défaut', () => {
    renderFreshness(Date.now() - 8 * DAY, 14);
    expect(screen.queryByText('sim_freshness.stale')).toBeNull();
  });

  it('indique l’absence de sim', () => {
    renderFreshness(null);
    expect(screen.getByText('sim_freshness.no_sim')).toBeInTheDocument();
  });
});

// SIMS-202 : badge « HPS » des gains importés de QE Live.
const renderMetric = (metric: string | null | undefined) =>
  render(
    <MantineProvider>
      <SimMetricBadge metric={metric} />
    </MantineProvider>,
  );

describe('<SimMetricBadge />', () => {
  it('marque « HPS » un gain de soigneur importé de QE Live', () => {
    renderMetric('hps');
    expect(screen.getByText('sim_metric.hps')).toBeInTheDocument();
  });

  it.each(['dps', null, undefined])('n’affiche rien pour une sim %s', (metric) => {
    renderMetric(metric);
    expect(screen.queryByText('sim_metric.hps')).toBeNull();
  });

  it('reste masqué tant que la fonctionnalité est en développement', () => {
    flags.hpsSims = false;
    renderMetric('hps');
    expect(screen.queryByText('sim_metric.hps')).toBeNull();
  });
});
