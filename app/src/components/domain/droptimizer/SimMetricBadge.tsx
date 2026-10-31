import { Badge, Tooltip } from '@mantine/core';
import { isFeatureEnabled } from 'config/featureFlags';
import { useTranslation } from 'react-i18next';
import { simMetricOf } from 'utils/droptimizer';

interface SimMetricBadgeProps {
  /** Grandeur de la sim (`upgrades.metric`) ; rien n'est affiché pour une sim DPS. */
  metric?: string | null;
}

/**
 * Badge « HPS » d'un gain importé de QE Live (SIMS-202). Son infobulle rappelle
 * qu'un gain de soins ne se compare pas tel quel à un gain de DPS, et la limite
 * de QE Live : seuls les niveaux d'amélioration 1/6 et 6/6 sont simulés.
 *
 * Masqué tant que `hps-sims` est en cours de développement.
 */
export function SimMetricBadge({ metric }: SimMetricBadgeProps) {
  const { t } = useTranslation('tracking');
  if (!isFeatureEnabled('hps-sims') || simMetricOf(metric) !== 'hps') return null;

  return (
    <Tooltip label={t('sim_metric.hps_tooltip')} multiline w={280} withArrow>
      <Badge size="xs" color="teal" variant="light" style={{ textTransform: 'none' }}>
        {t('sim_metric.hps')}
      </Badge>
    </Tooltip>
  );
}
