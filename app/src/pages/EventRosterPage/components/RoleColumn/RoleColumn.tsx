import { ActionIcon, Badge, Card, Group, Image, Menu, Paper, Stack, Text } from '@mantine/core';
import { IconArrowRight, IconArrowsExchange } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { normalizeClass } from 'utils';
import { useTranslation } from 'react-i18next';

export interface TogglePlayer {
  id: number;
  name: string;
  class: string;
  specialization?: {
    id: number;
    name: string;
    role: string;
  };
  isActive: boolean;
  signupStatus?: string;
}

interface RoleColumnProps {
  role: string;
  items: TogglePlayer[];
  title: string;
  isEditable?: boolean;
  onToggle?: (characterId: number, isCurrentlyActive: boolean) => void;
  onChangeRole?: (characterId: number, newRole: string) => void;
}

const ROLE_OPTIONS = [
  { value: 'TANK', label: 'Tank' },
  { value: 'HEALER', label: 'Healer' },
  { value: 'MELEE', label: 'Melee' },
  { value: 'RANGED', label: 'Ranged' },
];

const getClassColor = (className: string | undefined) => {
  if (!className) return undefined;
  const key = className.toLowerCase().replace(/\s+/g, '_');
  return classColors[key as keyof typeof classColors] || undefined;
};

const RoleColumn = ({
  role,
  items,
  title,
  isEditable = true,
  onToggle,
  onChangeRole,
}: RoleColumnProps) => {
  const { t } = useTranslation('eventRoster');

  const activeCount = items.filter((p) => p.isActive).length;

  const sortedItems = [...items].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.name.localeCompare(b.name);
  });

  const otherRoles = ROLE_OPTIONS.filter((r) => r.value !== role);

  return (
    <Paper withBorder p="md" bg="dark.8">
      <Stack gap={0} h="100%">
        <Group justify="space-between" mb="xs">
          <Text fw={700} tt="uppercase" c="dimmed" size="xs">
            {title}
          </Text>
          <Badge variant="light" color="gray" size="sm">
            {activeCount}/{items.length}
          </Badge>
        </Group>

        <Stack gap={4} flex={1}>
          {items.length === 0 && (
            <Text size="xs" c="dimmed" ta="center" py="xs">
              {t('empty', { defaultValue: 'Aucun joueur' })}
            </Text>
          )}

          {sortedItems.map((player) => (
            <Card
              key={player.id}
              padding="4px 8px"
              radius="sm"
              withBorder
              opacity={player.isActive ? 1 : 0.5}
              onClick={() => {
                if (isEditable && onToggle) {
                  onToggle(player.id, player.isActive);
                }
              }}
              style={{
                cursor: isEditable ? 'pointer' : 'default',
                borderLeftWidth: '3px',
                borderLeftStyle: 'solid',
                borderLeftColor: player.isActive
                  ? getClassColor(player.class)
                  : 'var(--mantine-color-dark-4)',
                backgroundColor: player.isActive ? undefined : 'var(--mantine-color-dark-7)',
                filter: player.isActive ? 'none' : 'grayscale(60%)',
                transition: 'all 0.15s ease',
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap={6} wrap="nowrap">
                  <Image
                    src={`/src/character/class/${normalizeClass(player.class)}-icon.svg`}
                    alt={player.class}
                    w={16}
                    h={16}
                    style={{ flexShrink: 0 }}
                  />
                  <Text
                    size="sm"
                    fw={700}
                    c={player.isActive ? getClassColor(player.class) : 'dimmed'}
                    style={{ lineHeight: 1.2 }}
                  >
                    {player.name}
                  </Text>
                </Group>
                <Group gap={4} wrap="nowrap">
                  {player.signupStatus && player.isActive && player.signupStatus !== 'PRESENT' && (
                    <Badge
                      size="xs"
                      variant="light"
                      p="0 4px"
                      style={{ height: '16px', fontSize: '9px' }}
                      color={
                        player.signupStatus === 'LATE'
                          ? 'yellow'
                          : player.signupStatus === 'INHERITED'
                            ? 'blue'
                            : 'gray'
                      }
                    >
                      {player.signupStatus === 'INHERITED' ? 'ALT' : player.signupStatus}
                    </Badge>
                  )}
                  <Text size="10px" c="dimmed" style={{ lineHeight: 1.2 }}>
                    {player.specialization?.name}
                  </Text>

                  {player.isActive && isEditable && onChangeRole && (
                    <Menu shadow="md" width={160} position="right-start" withArrow>
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconArrowsExchange size={12} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Déplacer vers</Menu.Label>
                        {otherRoles.map((r) => (
                          <Menu.Item
                            key={r.value}
                            leftSection={<IconArrowRight size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeRole(player.id, r.value);
                            }}
                          >
                            {r.label}
                          </Menu.Item>
                        ))}
                      </Menu.Dropdown>
                    </Menu>
                  )}
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default RoleColumn;
