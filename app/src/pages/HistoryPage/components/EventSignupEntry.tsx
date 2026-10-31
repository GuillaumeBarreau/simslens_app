import { Badge, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCalendarEvent } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ActivityLog, EventSignupMetadata } from 'services/history.service';

import styles from '../HistoryPage.module.css';
import { ActorLabel } from './ActorLabel';

interface EventSignupEntryProps {
  log: ActivityLog;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  ABSENT: 'red',
  LATE: 'orange',
  TENTATIVE: 'yellow',
  BENCH: 'gray',
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <Badge variant="light" color={STATUS_COLORS[status] ?? 'gray'} size="sm">
      {label}
    </Badge>
  );
}

export function EventSignupEntry({ log }: EventSignupEntryProps) {
  const { t } = useTranslation('history');
  const meta = log.metadata as EventSignupMetadata | null;

  const statusLabel = (s: string) => t(`event.status.${s.toLowerCase()}`, { defaultValue: s });
  const eventDate = meta?.eventDate ? dayjs(meta.eventDate).format('DD/MM/YYYY') : '?';
  const isChange = !!meta?.oldStatus && meta.oldStatus !== meta?.status;

  return (
    <Group align="flex-start" gap={14} className={styles.entry}>
      <ThemeIcon size={38} radius="xl" color="red" variant="light">
        <IconCalendarEvent size={18} />
      </ThemeIcon>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} align="center" wrap="wrap">
          <Text component="span" fz="sm" lh={1.5} c="app.1">
            <ActorLabel characterName={log.characterName} />{' '}
            {t(isChange ? 'event.changed' : 'event.signup', { date: eventDate })}
          </Text>
          {isChange && meta?.oldStatus && (
            <>
              <StatusBadge status={meta.oldStatus} label={statusLabel(meta.oldStatus)} />
              <Text fz="xs" c="dimmed">
                →
              </Text>
            </>
          )}
          {meta?.status && <StatusBadge status={meta.status} label={statusLabel(meta.status)} />}
        </Group>
        <Group gap={6} mt={3}>
          <Badge variant="light" color="red" size="sm">
            {t('badges.event')}
          </Badge>
          {meta?.role && (
            <Badge variant="outline" color="gray" size="sm">
              {meta.role}
            </Badge>
          )}
          <Text fz="xs" c="dimmed">
            {dayjs(log.createdAt).fromNow()}
          </Text>
        </Group>
      </Stack>
    </Group>
  );
}
