import { Badge, Group, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from 'utils';
import {
  FRESHNESS_COLOR,
  getReportFreshness,
  parseReportTimestamp,
  type ReportTimestamp,
} from 'utils/droptimizer';

interface SimFreshnessProps {
  /** Horodatage du dernier rapport importé (secondes, millisecondes ou date ISO). */
  timestamp: ReportTimestamp;
  /** Seuil de péremption de la guilde, en jours. */
  staleAfterDays: number;
}

/**
 * Date du dernier sim importé, suivie d'un badge « Sim périmé » au-delà du seuil
 * de la guilde (SIMS-199). Utilisé par le suivi des sims et l'optimiseur.
 */
export function SimFreshness({ timestamp, staleAfterDays }: SimFreshnessProps) {
  const { t, i18n } = useTranslation('tracking');
  // Dates dans la langue de l'interface (fr par défaut si i18n n'en a pas encore).
  const locale = i18n?.resolvedLanguage || i18n?.language || 'fr';
  const ms = parseReportTimestamp(timestamp);

  if (ms === null) {
    return (
      <Text size="xs" c="dimmed">
        {t('sim_freshness.no_sim')}
      </Text>
    );
  }

  const freshness = getReportFreshness(ms, Date.now(), staleAfterDays);
  const isStale = freshness === 'stale';

  return (
    <Tooltip
      label={t(isStale ? 'sim_freshness.tooltip_stale' : 'sim_freshness.tooltip', {
        date: formatTimestamp(ms, { includeTime: true, locale }),
        days: staleAfterDays,
      })}
      withArrow
    >
      <Group gap={4} wrap="nowrap" style={{ display: 'inline-flex' }}>
        <Text size="xs" c={FRESHNESS_COLOR[freshness]}>
          {formatTimestamp(ms, { includeTime: false, locale })}
        </Text>
        {isStale && (
          <Badge size="xs" color="red" variant="light" style={{ textTransform: 'none' }}>
            {t('sim_freshness.stale')}
          </Badge>
        )}
      </Group>
    </Tooltip>
  );
}
