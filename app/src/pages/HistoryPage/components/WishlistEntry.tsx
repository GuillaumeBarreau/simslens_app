import { Badge, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';
import { WowheadLink } from 'components/domain/loot/WowheadLink/WowheadLink';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import type { ActivityLog, WishlistUpdateMetadata } from 'services/history.service';

import styles from '../HistoryPage.module.css';
import { ActorLabel } from './ActorLabel';

interface WishlistEntryProps {
  log: ActivityLog;
}

export function WishlistEntry({ log }: WishlistEntryProps) {
  const { t } = useTranslation('history');
  const meta = log.metadata as WishlistUpdateMetadata | null;

  if (!meta) return null;

  const { oldItemId: oldId, newItemId: newId, oldItemName, newItemName, slot } = meta;

  const isRemoval = oldId != null && newId == null;
  const isNew = oldId == null && newId != null;
  const isReplacement = oldId != null && newId != null;

  return (
    <Group align="flex-start" gap={14} className={styles.entry}>
      <ThemeIcon size={38} radius="xl" color="indigo" variant="light">
        <IconListDetails size={18} />
      </ThemeIcon>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text component="div" fz="sm" lh={1.5} c="app.1" style={{ wordBreak: 'break-word' }}>
          <ActorLabel characterName={log.characterName} />{' '}
          {isRemoval && (
            <>
              {t('wishlist.removed')}{' '}
              <WowheadLink itemId={oldId} style={{ color: '#a335ee', fontWeight: 600 }}>
                {oldItemName || `item #${oldId}`}
              </WowheadLink>{' '}
              {t('wishlist.from_wishlist')}
            </>
          )}
          {isNew && (
            <>
              {t('wishlist.added')}{' '}
              <WowheadLink itemId={newId} style={{ color: '#a335ee', fontWeight: 600 }}>
                {newItemName || `item #${newId}`}
              </WowheadLink>{' '}
              {t('wishlist.to_wishlist')}
            </>
          )}
          {isReplacement && (
            <>
              {t('wishlist.replaced')}{' '}
              <WowheadLink itemId={oldId} style={{ color: '#a335ee', fontWeight: 600 }}>
                {oldItemName || `item #${oldId}`}
              </WowheadLink>{' '}
              {t('wishlist.with')}{' '}
              <WowheadLink itemId={newId} style={{ color: '#a335ee', fontWeight: 600 }}>
                {newItemName || `item #${newId}`}
              </WowheadLink>{' '}
              {t('wishlist.in_wishlist')}
            </>
          )}
          {slot && (
            <Badge variant="light" color="gray" size="xs" ml={4}>
              {slot}
            </Badge>
          )}
        </Text>
        <Group gap={6} mt={3}>
          <Badge variant="light" color="violet" size="sm">
            {t('badges.wishlist')}
          </Badge>
          <Text fz="xs" c="dimmed">
            {dayjs(log.createdAt).fromNow()}
          </Text>
        </Group>
      </Stack>
    </Group>
  );
}
