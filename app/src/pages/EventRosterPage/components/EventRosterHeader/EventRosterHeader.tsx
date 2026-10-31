import { Button, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowLeft,
  IconCloudDownload,
  IconLayoutDashboard,
  IconNotes,
  IconSparkles,
  IconTable,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface EventRosterHeaderProps {
  title: string;
  startTime: string;
  canEdit?: boolean;
  viewMode?: 'MATRIX' | 'SUMMARY';
  onViewModeChange?: (view: 'MATRIX' | 'SUMMARY') => void;
  onImport?: () => void;
  onGenerate?: () => void;
  /** Ouvre les notes par boss ; bouton absent sans ce gestionnaire. */
  onOpenNotes?: () => void;
}

export const EventRosterHeader = ({
  title,
  startTime,
  canEdit,
  viewMode,
  onViewModeChange,
  onImport,
  onGenerate,
  onOpenNotes,
}: EventRosterHeaderProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation('eventRoster');

  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="md">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(-1)}
        >
          {t('back')}
        </Button>
        <Stack gap={0}>
          <Title order={3} c="white">
            {title}
          </Title>
          <Text size="sm" c="dimmed">
            {new Date(startTime).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Stack>
      </Group>

      <Group gap="sm">
        {onOpenNotes && (
          <Button
            variant="light"
            color="gray"
            leftSection={<IconNotes size={16} />}
            onClick={onOpenNotes}
          >
            {t('bossNotes.button')}
          </Button>
        )}

        {canEdit && onGenerate && (
          <Button
            variant="light"
            color="grape"
            leftSection={<IconSparkles size={16} />}
            onClick={onGenerate}
          >
            {t('generate.button')}
          </Button>
        )}

        {canEdit && onImport && (
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconCloudDownload size={16} />}
            onClick={onImport}
          >
            {t('import.button')}
          </Button>
        )}

        {canEdit && onViewModeChange && (
          <SegmentedControl
            value={viewMode}
            color="brand.5"
            onChange={(value) => onViewModeChange(value as 'MATRIX' | 'SUMMARY')}
            data={[
              {
                value: 'MATRIX',
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <IconTable size={16} />
                    <span>{t('view_composition')}</span>
                  </Group>
                ),
              },
              {
                value: 'SUMMARY',
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <IconLayoutDashboard size={16} />
                    <span>{t('view_summary')}</span>
                  </Group>
                ),
              },
            ]}
            radius="md"
            size="sm"
          />
        )}
      </Group>
    </Group>
  );
};

export default EventRosterHeader;
