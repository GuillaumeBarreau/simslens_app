import { Group, Text, ThemeIcon, Title } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function HistoryHeader() {
  const { t } = useTranslation('history');
  return (
    <Group gap="md">
      <ThemeIcon
        size="xl"
        variant="gradient"
        gradient={{ from: 'violet', to: 'indigo' }}
        radius="md"
      >
        <IconHistory size={28} />
      </ThemeIcon>
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
          {t('subtitle')}
        </Text>
        <Title order={2}>{t('title')}</Title>
      </div>
    </Group>
  );
}
