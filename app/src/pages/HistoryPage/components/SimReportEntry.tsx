import { Badge, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconFileUpload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ActivityLog, SimReportUploadMetadata } from 'services/history.service';

import styles from '../HistoryPage.module.css';
import { ActorLabel } from './ActorLabel';

interface SimReportEntryProps {
  log: ActivityLog;
}

export function SimReportEntry({ log }: SimReportEntryProps) {
  const { t } = useTranslation('history');
  const meta = log.metadata as SimReportUploadMetadata | null;

  return (
    <Group align="flex-start" gap={14} className={styles.entry}>
      <ThemeIcon size={38} radius="xl" color="teal" variant="light">
        <IconFileUpload size={18} />
      </ThemeIcon>
      <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
        <Text component="div" fz="sm" lh={1.5} c="app.1" style={{ wordBreak: 'break-word' }}>
          <ActorLabel characterName={log.characterName} /> {t('sim.uploaded')}
          {meta?.filename && (
            <>
              {' '}
              —{' '}
              <Text component="span" fw={600} c="app.0">
                {meta.filename}
              </Text>
            </>
          )}
        </Text>
        <Group gap={6} mt={3}>
          <Badge variant="light" color="teal" size="sm">
            {t('badges.sim_report')}
          </Badge>
          <Text fz="xs" c="dimmed">
            {dayjs(log.createdAt).fromNow()}
          </Text>
        </Group>
      </Stack>
    </Group>
  );
}
