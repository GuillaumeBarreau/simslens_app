import { Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { type GearAnomaly, slotSeverity } from '../activitySummary';
import classes from '../MyActivityPage.module.css';

/**
 * Pastille posée sur un emplacement du paperdoll (SIMS-239) : rouge s'il manque
 * un enchantement ou une gemme, orange s'ils ne sont que de rang 1.
 */
export function SlotAnomalyBadge({ anomalies }: { anomalies: GearAnomaly[] }) {
  const { t } = useTranslation('myActivity');
  const severity = slotSeverity(anomalies);
  if (severity === 'ok') return null;

  const lines = anomalies.map((a) => {
    const label = t(`anomalies.${a.kind}_${a.issue}`);
    return a.displayName && a.issue !== 'missing' ? `${label} (${a.displayName})` : label;
  });

  return (
    <Tooltip
      label={
        <Stack gap={2}>
          {lines.map((line) => (
            <Text key={line} size="xs">
              {line}
            </Text>
          ))}
        </Stack>
      }
      withArrow
      position="top"
    >
      <span className={classes.slotBadge} data-status={severity} aria-label={lines.join(', ')}>
        !
      </span>
    </Tooltip>
  );
}
