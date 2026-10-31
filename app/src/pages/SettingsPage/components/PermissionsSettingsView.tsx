import { Alert, Badge, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { SettingsGroup, SettingsSwitchRow } from 'components/design-system/organisms/SettingsGroup';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isPermissionGranted, PERMISSION_GROUPS } from '../permissionsPresentation';

const adminRole = {
  manage_realm: true,
  delete_realm: true,
  view_roster: true,
  edit_roster: true,
  sync_characters: true,
  manage_raid: true,
  view_loot_history: true,
  assign_loot: true,
  delete_loot: true,
  edit_loot: true,
  import_simc: true,
  manage_instance: false,
  view_wishlist: true,
  manage_wishlist: true,
  create_event: true,
  edit_event: true,
  delete_event: true,
  signup_event: true,
  manage_signups: true,
  manage_event_roster: true,
  view_activity_log: true,
};

const memberRole = {
  manage_realm: false,
  delete_realm: false,
  view_roster: true,
  edit_roster: false,
  sync_characters: true,
  manage_raid: false,
  view_loot_history: true,
  assign_loot: false,
  delete_loot: false,
  edit_loot: false,
  import_simc: true,
  manage_instance: false,
  view_wishlist: true,
  manage_wishlist: true,
  create_event: false,
  edit_event: false,
  delete_event: false,
  signup_event: true,
  manage_signups: false,
  manage_event_roster: false,
  view_activity_log: false,
};

export function PermissionsSettingsView() {
  const { t } = useTranslation('permissionsSettings');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('admin');

  const activeRoleConfig = selectedRole === 'admin' ? adminRole : memberRole;

  return (
    <Stack gap="lg" maw={800}>
      <Alert color="brand.5" variant="light">
        <Text size="sm">{t('description')}</Text>
      </Alert>

      <Group justify="space-between" gap="sm">
        <SegmentedControl
          value={selectedRole}
          onChange={(value) => setSelectedRole(value as 'admin' | 'member')}
          aria-label={t('roles.label')}
          data={[
            { label: t('roles.admin'), value: 'admin' },
            { label: t('roles.member'), value: 'member' },
          ]}
          color="brand.5"
          size="sm"
          w={{ base: '100%', xs: 320 }}
        />
        <Badge variant="default" color="gray" leftSection={<IconLock size={12} />}>
          {t('read_only')}
        </Badge>
      </Group>

      {PERMISSION_GROUPS.map((group) => (
        <SettingsGroup
          key={group.key}
          title={t(`categories.${group.key}`)}
          icon={<group.icon size={18} stroke={1.5} />}
        >
          {group.permissions.map(({ permission, icon: PermissionIcon }) => (
            // Aperçu en lecture seule : pas de onChange, l'interrupteur montre l'état du rôle.
            <SettingsSwitchRow
              key={permission}
              icon={<PermissionIcon size={20} stroke={1.5} />}
              title={t(`permissions.${permission}`)}
              description={t(`permission_descriptions.${permission}`)}
              checked={isPermissionGranted(activeRoleConfig, permission)}
            />
          ))}
        </SettingsGroup>
      ))}
    </Stack>
  );
}
