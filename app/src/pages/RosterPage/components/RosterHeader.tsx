import { Box, Button, Group, Menu, Stack, Title } from '@mantine/core';
import {
  IconChevronDown,
  IconCloudDownload,
  IconShield,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import { Text } from 'components/design-system/atoms';
import { GuildImportDrawer } from 'components/domain/sync/GuildImportDrawer';
import { useTranslation } from 'react-i18next';
import type { BlizzardGuildMember } from 'types/blizzard.types';
import { Permission } from 'types/permissions';
import { Can } from 'utils/auth';

import classes from '../RosterPage.module.css';

interface RosterHeaderProps {
  realmData: { id: number; server: string; guildName: string; region?: string } | null | undefined;
  memberCount: number;
  pendingCount: number;
  guestCount: number | null;
  isFetchingRoster: boolean;
  isClearing: boolean;
  importDrawerOpened: boolean;
  rosterData: BlizzardGuildMember[];
  canManageAdmins: boolean;
  onAdd: () => void;
  onImport: () => void;
  onImportDrawerClose: () => void;
  onImportSuccess: () => void;
  onManageAdmins: () => void;
  onClearUpgrades: () => void;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function RosterHeader({
  realmData,
  memberCount,
  pendingCount,
  guestCount,
  isFetchingRoster,
  isClearing,
  importDrawerOpened,
  rosterData,
  canManageAdmins,
  onAdd,
  onImport,
  onImportDrawerClose,
  onImportSuccess,
  onManageAdmins,
  onClearUpgrades,
}: RosterHeaderProps) {
  const { t } = useTranslation('roster');
  const counts = [
    t('page.header.members', { count: memberCount }),
    pendingCount > 0 ? t('page.header.pending', { count: pendingCount }) : null,
    guestCount ? t('page.header.guests', { count: guestCount }) : null,
  ].filter(Boolean);

  return (
    <Box className={classes.panel} p="lg">
      <Group justify="space-between" align="flex-start" gap="md">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Text variant="section-label">{t('page.header.label')}</Text>
          <Title order={2}>{capitalize(realmData?.guildName || '')}</Title>
          <Text size="sm" c="dimmed">
            {[realmData?.server ? capitalize(realmData.server) : null, ...counts]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </Stack>

        {realmData && (
          <Can I={Permission.EDIT_ROSTER}>
            <Group gap="xs">
              <Menu position="bottom-end" withinPortal shadow="md" width={260}>
                <Menu.Target>
                  <Button
                    variant="default"
                    rightSection={<IconChevronDown size={14} />}
                    loading={isFetchingRoster || isClearing}
                  >
                    {t('page.header.more')}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconCloudDownload size={16} stroke={1.5} />}
                    onClick={onImport}
                  >
                    {t('actions.sync_battlenet')}
                  </Menu.Item>
                  {canManageAdmins && (
                    <Menu.Item
                      leftSection={<IconShield size={16} stroke={1.5} />}
                      onClick={onManageAdmins}
                    >
                      {t('actions.manage_admins')}
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Label>{t('page.header.danger_zone')}</Menu.Label>
                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={16} stroke={1.5} />}
                    onClick={onClearUpgrades}
                  >
                    {t('actions.clear_upgrades')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Button leftSection={<IconUserPlus size={16} />} color="brand.5" onClick={onAdd}>
                {t('actions.add_manual')}
              </Button>
            </Group>
          </Can>
        )}
      </Group>

      {realmData && (
        <GuildImportDrawer
          opened={importDrawerOpened}
          onClose={onImportDrawerClose}
          realm={realmData.server}
          guild={realmData.guildName}
          region={realmData.region || 'eu'}
          realmId={realmData.id}
          initialData={rosterData}
          onImportSuccess={onImportSuccess}
        />
      )}
    </Box>
  );
}
