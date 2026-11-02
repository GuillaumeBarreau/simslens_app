import { Container, Flex, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconBrandDiscord, IconChecks, IconShieldLock, IconTicket } from '@tabler/icons-react';
import { Select } from 'components/design-system/atoms';
import { useRealmAccess } from 'contexts';
import { useGame } from 'hooks/useGame';
import { useRouteParams } from 'hooks/useRouteParams';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Permission } from 'types/permissions';

import { DiscordSettingsView } from './components/DiscordSettingsView';
import { InviteCodesSettingsView } from './components/InviteCodesSettingsView';
import { PermissionsSettingsView } from './components/PermissionsSettingsView';
import { ValidationSettingsView } from './components/ValidationSettingsView';

type SettingsCategory = 'validation' | 'discord' | 'permissions' | 'invites';

export default function SettingsPage() {
  const { t } = useTranslation(['common', 'validationSettings', 'discordSettings']);
  const { hasPermission } = useRealmAccess();
  const { guild } = useRouteParams();
  // La validation des sims n'existe pas sans Droptimizer (Forever).
  const showValidation = useGame().has('simValidation') && hasPermission(Permission.MANAGE_REALM);

  const initialCategory: SettingsCategory | null = showValidation
    ? 'validation'
    : hasPermission(Permission.MANAGE_RAID)
      ? 'discord'
      : hasPermission(Permission.MANAGE_REALM)
        ? 'permissions'
        : null;

  const [activeCategory, setActiveCategory] = useState<SettingsCategory | null>(initialCategory);

  if (!initialCategory) {
    return <Navigate to={`/${guild}/The-War-Within/roster`} replace />;
  }

  const categories = [
    ...(showValidation
      ? [
          {
            id: 'validation' as const,
            label: t('validationSettings:title', 'Validation Settings'),
            icon: IconChecks,
          },
        ]
      : []),
    ...(hasPermission(Permission.MANAGE_RAID)
      ? [
          {
            id: 'discord' as const,
            label: t('discordSettings:title', 'Discord Integration'),
            icon: IconBrandDiscord,
          },
        ]
      : []),
    ...(hasPermission(Permission.MANAGE_REALM) // Usually global settings require Global Admin or Realm Admin
      ? [
          {
            id: 'permissions' as const,
            label: t('permissionsSettings:title', 'Permissions'),
            icon: IconShieldLock,
          },
          {
            id: 'invites' as const,
            label: t('inviteSettings:title', 'Invitations'),
            icon: IconTicket,
          },
        ]
      : []),
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'validation':
        return <ValidationSettingsView />;
      case 'discord':
        return <DiscordSettingsView />;
      case 'permissions':
        return <PermissionsSettingsView />;
      case 'invites':
        return <InviteCodesSettingsView />;
      default:
        return null;
    }
  };

  const activeCategoryLabel =
    categories.find((c) => c.id === activeCategory)?.label || t('common:settings', 'Settings');

  return (
    <Container size="xl" py="xl">
      <Flex gap="xl" align="flex-start">
        {/* Sidebar Navigation (tablette et ordinateur) */}
        <Stack
          visibleFrom="sm"
          w={260}
          gap={4}
          pr="md"
          style={{
            flexShrink: 0,
            position: 'sticky',
            top: 80,
            borderRight: '1px solid var(--mantine-color-dark-5)',
          }}
        >
          <Text size="sm" fw={600} mb="sm" c="dimmed" tt="uppercase" lts={1}>
            {t('common:settings', 'Settings')}
          </Text>
          {categories.map((item) => {
            const isActive = activeCategory === item.id;
            return (
              <UnstyledButton
                key={item.id}
                onClick={() => setActiveCategory(item.id)}
                aria-current={isActive ? 'page' : undefined}
                px="md"
                py="sm"
                style={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  borderRadius: theme.radius.sm,
                  backgroundColor: isActive ? 'var(--mantine-color-brand-9)' : 'transparent',
                  color: isActive ? 'white' : 'var(--mantine-color-dark-0)',
                  transition: 'background-color 150ms ease, color 150ms ease',
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'var(--mantine-color-brand-8)'
                      : 'var(--mantine-color-dark-6)',
                  },
                })}
              >
                <item.icon size={20} style={{ marginRight: 12 }} />
                <Text size="sm" fw={isActive ? 600 : 400}>
                  {item.label}
                </Text>
              </UnstyledButton>
            );
          })}
        </Stack>

        <Flex direction="column" flex={1} miw={0}>
          {/* Navigation mobile : la barre latérale ne tient pas sur un téléphone. */}
          <Select
            hiddenFrom="sm"
            mb="md"
            size="sm"
            aria-label={t('common:settings', 'Settings')}
            allowDeselect={false}
            data={categories.map((c) => ({ value: c.id, label: c.label }))}
            value={activeCategory}
            onChange={(value) => value && setActiveCategory(value as SettingsCategory)}
          />
          <Text size="xl" fw={700} mb="lg">
            {activeCategoryLabel}
          </Text>
          {renderContent()}
        </Flex>
      </Flex>
    </Container>
  );
}
