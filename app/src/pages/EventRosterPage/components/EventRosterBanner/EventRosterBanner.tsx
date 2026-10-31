import { Box, Skeleton, Stack, Text } from '@mantine/core';
import { NavbarBoss } from 'components/design-system/organisms/NavbarBoss';
import { useTranslation } from 'react-i18next';
import type { Boss } from 'types/raid';

import './EventRosterBanner.module.css';

interface EventRosterBannerProps {
  bosses: Boss[];
  selectedBossId: number | null;
  onBossSelect: (bossId: number) => void;
  season: string;
  isLoading?: boolean;
}

export const EventRosterBanner = ({
  bosses,
  selectedBossId,
  onBossSelect,
  isLoading,
}: EventRosterBannerProps) => {
  const { t } = useTranslation('eventRoster');

  if (isLoading) {
    return (
      <Stack gap="xs">
        <Skeleton height={120} radius="md" />
        <Skeleton height={50} radius="md" />
      </Stack>
    );
  }

  if (bosses.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t('noBosses', {
          defaultValue: 'Aucun boss associé à cet événement',
        })}
      </Text>
    );
  }

  return (
    <Box>
      <NavbarBoss
        bosses={bosses}
        activeIndex={bosses.findIndex((b) => b.id === selectedBossId)}
        onSelect={(index) => {
          const boss = bosses[index];
          if (boss) onBossSelect(boss.id);
        }}
        disableNavigation={true}
      />
    </Box>
  );
};
