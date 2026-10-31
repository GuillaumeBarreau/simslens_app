import { Badge, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { WishSlotStatus } from 'types/character.types';

import { formatGain, WISH_STATE_COLORS } from './insights';

interface WishStatusBadgeProps {
  status: WishSlotStatus;
  /** Le relevé d'équipement utilisé vient d'une autre spé que la wishlist. */
  snapshotOtherSpec?: boolean;
}

/**
 * État d'un vœu (SIMS-205) : déjà porté, battu par l'équipement actuel, gain,
 * sans sim ou « je n'en veux pas ». L'infobulle explique la règle retenue.
 */
export function WishStatusBadge({ status, snapshotOtherSpec = false }: WishStatusBadgeProps) {
  const { t } = useTranslation('wishlist');
  const { gain, percent } = formatGain(status.dpsGain, status.gainPercent);

  return (
    <Tooltip
      withArrow
      multiline
      maw={320}
      label={
        <Stack gap={4}>
          <Text size="xs">
            {t(`insights.status_hint.${status.state}`, {
              ilvl: status.equippedItemLevel ?? '?',
              gain,
              percent,
            })}
          </Text>
          {status.state === 'equipped' && snapshotOtherSpec && (
            <Text size="xs" c="dimmed">
              {t('insights.snapshot_other_spec')}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            {t('insights.rule')}
          </Text>
        </Stack>
      }
    >
      <Badge
        variant="light"
        color={WISH_STATE_COLORS[status.state]}
        leftSection={status.obsolete ? <IconAlertTriangle size={12} /> : undefined}
        style={{ cursor: 'help', textTransform: 'none' }}
      >
        {t(`insights.status.${status.state}`)}
      </Badge>
    </Tooltip>
  );
}
