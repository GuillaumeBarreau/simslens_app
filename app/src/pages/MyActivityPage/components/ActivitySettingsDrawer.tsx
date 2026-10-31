import { Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { Drawer } from 'components/design-system/organisms/Drawer';
import { useTranslation } from 'react-i18next';

import { ActivityCalendarFeedSection } from './ActivityCalendarFeedSection';
import { ActivitySpecializationsSection } from './ActivitySpecializationsSection';

interface ActivitySettingsDrawerProps {
  opened: boolean;
  onClose: () => void;
  characterId: number;
  /** Drapeau `character-specializations`. */
  showSpecializations: boolean;
  /** Drapeau `calendar-feed`. */
  showCalendarFeed: boolean;
}

/**
 * Réglages rarement modifiés de « Mon activité » (SIMS-239), sortis de la page :
 * spécialisations et agenda iCal, chacun sous son drapeau.
 */
export function ActivitySettingsDrawer({
  opened,
  onClose,
  characterId,
  showSpecializations,
  showCalendarFeed,
}: ActivitySettingsDrawerProps) {
  const { t } = useTranslation('myActivity');

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title={
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon size={36} radius="md" variant="light" color="gray">
            <IconSettings size={20} />
          </ThemeIcon>
          <div>
            <Title order={4}>{t('settings.title')}</Title>
            <Text size="xs" c="dimmed">
              {t('settings.description')}
            </Text>
          </div>
        </Group>
      }
    >
      <Stack gap="md">
        {showSpecializations && <ActivitySpecializationsSection characterId={characterId} />}
        {showCalendarFeed && <ActivityCalendarFeedSection />}
      </Stack>
    </Drawer>
  );
}
