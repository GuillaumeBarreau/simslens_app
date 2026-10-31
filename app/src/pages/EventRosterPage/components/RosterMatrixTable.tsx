import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Menu,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDotsVertical,
  IconX,
} from '@tabler/icons-react';
import { SplitBadge } from 'components/design-system/molecules';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RaidGuest, RaidGuestAssignment } from 'services/event.service';
import type { PoolCharacter, RosterAssignment } from 'services/roster.service';
import { normalizeClass } from 'utils';

const ROLES = {
  TANK: 'TANK',
  HEALER: 'HEALER',
  MELEE: 'MELEE',
  RANGED: 'RANGED',
} as const;

type RoleType = (typeof ROLES)[keyof typeof ROLES];

interface RosterMatrixTableProps {
  bosses: { id: number; name: string; icon: string }[];
  poolCharacters: PoolCharacter[];
  assignments: RosterAssignment[];
  onToggle: (characterId: number, bossId: number, role: RoleType | null) => void;
  onAssignAll?: (characterId: number, role: RoleType | null) => void;
  isEditable?: boolean;
  guests?: RaidGuest[];
  guestAssignments?: RaidGuestAssignment[];
  onGuestToggle?: (guestId: number, bossId: number, role: RoleType | null) => void;
  difficulty?: string;
  onMoveBoss?: (bossId: number, direction: 'left' | 'right') => void;
}

function mapSpecRole(specRole?: string | null): RoleType {
  if (!specRole) return ROLES.MELEE;
  const upper = specRole.toUpperCase();
  if (upper === 'TANK') return ROLES.TANK;
  if (upper === 'HEALER') return ROLES.HEALER;
  if (upper === 'MELEE') return ROLES.MELEE;
  if (upper === 'RANGED') return ROLES.RANGED;
  return ROLES.MELEE;
}

const ROLE_COLORS: Record<string, string> = {
  TANK: 'blue',
  HEALER: 'green',
  MELEE: 'red',
  RANGED: 'orange',
};

const EMPTY_GUESTS: RaidGuest[] = [];
const EMPTY_GUEST_ASSIGNMENTS: RaidGuestAssignment[] = [];

export const RosterMatrixTable: React.FC<RosterMatrixTableProps> = ({
  bosses,
  poolCharacters,
  assignments,
  onToggle,
  onAssignAll,
  isEditable = true,
  guests = EMPTY_GUESTS,
  guestAssignments = EMPTY_GUEST_ASSIGNMENTS,
  onGuestToggle,
  difficulty,
  onMoveBoss,
}) => {
  const maxPlayers =
    difficulty === 'mythic' ? 20 : poolCharacters.filter((p) => !p.disabled).length + guests.length;
  const { t } = useTranslation('eventRoster');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({ ABSENT: true });
  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const assignmentMap = useMemo(() => {
    const map: Record<string, RosterAssignment> = {};
    assignments.forEach((a) => {
      if (a.bossId) {
        map[`${a.characterId}-${a.bossId}`] = a;
      }
    });
    return map;
  }, [assignments]);

  const getPlayerDefaultRole = useCallback(
    (player: PoolCharacter) => mapSpecRole(player.specialization?.role),
    [],
  );

  const groupedPlayers = useMemo(() => {
    const groups: Record<string, PoolCharacter[]> = {
      TANKS: [],
      HEALS: [],
      'RANGE DPS': [],
      'MELEE DPS': [],
      ABSENT: [],
    };

    poolCharacters.forEach((player) => {
      if (player.disabled) {
        groups['ABSENT'].push(player);
      } else if (!player.inConcurrentEvent) {
        const role = getPlayerDefaultRole(player);
        if (role === 'TANK') groups['TANKS'].push(player);
        else if (role === 'HEALER') groups['HEALS'].push(player);
        else if (role === 'RANGED') groups['RANGE DPS'].push(player);
        else if (role === 'MELEE') groups['MELEE DPS'].push(player);
      }
    });

    const statusOrder: Record<string, number> = {
      TENTATIVE: 0,
      PRESENT: 1,
      INHERITED: 1,
      LATE: 2,
      BENCH: 3,
      ABSENT: 4,
    };
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) => (statusOrder[a.signupStatus] ?? 1) - (statusOrder[b.signupStatus] ?? 1),
      );
    }

    return groups;
  }, [poolCharacters, getPlayerDefaultRole]);

  const splitPlayers = useMemo(() => {
    const roleOrder: Record<string, number> = { TANK: 0, HEALER: 1, MELEE: 2, RANGED: 3 };
    return poolCharacters
      .filter((p) => !p.disabled && p.inConcurrentEvent)
      .sort(
        (a, b) =>
          (roleOrder[getPlayerDefaultRole(a)] ?? 2) - (roleOrder[getPlayerDefaultRole(b)] ?? 2),
      );
  }, [poolCharacters, getPlayerDefaultRole]);

  const getPlayerAssignmentCount = useCallback(
    (playerId: number) => {
      return assignments.filter((a) => a.characterId === playerId).length;
    },
    [assignments],
  );

  const RAID_BUFFS = useMemo(
    () => [
      {
        id: 'druid',
        label: t('raidBuffs.druid', { defaultValue: 'Druid' }),
        icon: '/src/character/class/druid-icon.svg',
      },
      {
        id: 'mage',
        label: t('raidBuffs.mage', { defaultValue: 'Mage' }),
        icon: '/src/character/class/mage-icon.svg',
      },
      {
        id: 'warrior',
        label: t('raidBuffs.warrior', { defaultValue: 'Warrior' }),
        icon: '/src/character/class/warrior-icon.svg',
      },
      {
        id: 'paladin',
        label: t('raidBuffs.paladin', { defaultValue: 'Paladin' }),
        icon: '/src/character/class/paladin-icon.svg',
      },
      {
        id: 'priest',
        label: t('raidBuffs.priest', { defaultValue: 'Priest' }),
        icon: '/src/character/class/priest-icon.svg',
      },
      {
        id: 'hunter',
        label: t('raidBuffs.hunter', { defaultValue: 'Hunter' }),
        icon: '/src/character/class/hunter-icon.svg',
      },
      {
        id: 'evoker',
        label: t('raidBuffs.evoker', { defaultValue: 'Evoker' }),
        icon: '/src/character/class/evoker-icon.svg',
      },
      {
        id: 'shaman',
        label: t('raidBuffs.shaman', { defaultValue: 'Shaman' }),
        icon: '/src/character/class/shaman-icon.svg',
      },
      {
        id: 'monk',
        label: t('raidBuffs.monk', { defaultValue: 'Monk' }),
        icon: '/src/character/class/monk-icon.svg',
      },
      {
        id: 'demon_hunter',
        label: t('raidBuffs.demon_hunter', { defaultValue: 'Demon Hunter' }),
        icon: '/src/character/class/demon_hunter-icon.svg',
      },
    ],
    [t],
  );

  const renderBuffsRow = () => (
    <React.Fragment>
      <Table.Tr bg="var(--mantine-color-dark-8)">
        <Table.Td
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 1,
            width: 200,
            minWidth: 200,
            background: 'var(--mantine-color-dark-8)',
            verticalAlign: 'middle',
          }}
        >
          <Box px="md">
            <Text size="xs" fw={700} c="dimmed">
              SYNTHÈSE
            </Text>
          </Box>
        </Table.Td>
        <Table.Td
          style={{
            position: 'sticky',
            left: 200,
            zIndex: 1,
            width: 48,
            minWidth: 48,
            background: 'var(--mantine-color-dark-8)',
          }}
        />
        {bosses.map((boss) => {
          const bossAssignments = assignments.filter((a) => a.bossId === boss.id);
          const presentClasses = new Set(
            bossAssignments.map((a) =>
              (a.character?.class || '').toLowerCase().replace(/\s+/g, '_'),
            ),
          );
          guestAssignments
            .filter((a) => a.bossId === boss.id)
            .forEach((a) => {
              const guest = guests.find((g) => g.id === a.guestId);
              if (guest?.class) presentClasses.add(guest.class.toLowerCase().replace(/\s+/g, '_'));
            });

          return (
            <Table.Td key={boss.id} style={{ verticalAlign: 'middle' }} p="xs">
              <Group
                gap={4}
                justify="center"
                align="center"
                style={{ maxWidth: 92, margin: '0 auto' }}
              >
                {RAID_BUFFS.map((buff) => {
                  const isActive = presentClasses.has(buff.id);
                  return (
                    <Tooltip key={buff.id} label={buff.label} withinPortal>
                      <Box
                        style={{
                          width: 14,
                          height: 14,
                          opacity: isActive ? 1 : 0.15,
                          filter: isActive ? 'none' : 'grayscale(100%)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <img
                          src={buff.icon}
                          alt={buff.label}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                    </Tooltip>
                  );
                })}
              </Group>
            </Table.Td>
          );
        })}
      </Table.Tr>
    </React.Fragment>
  );

  const renderPlayerRow = (player: PoolCharacter) => {
    const killsCount = getPlayerAssignmentCount(player.id);
    const isDisabled = player.disabled;
    const isInConcurrentEvent = !!player.inConcurrentEvent;
    const currentDefaultRole = getPlayerDefaultRole(player);

    const isLate = player.signupStatus === 'LATE';
    const isTentative = player.signupStatus === 'TENTATIVE';
    const rowBg = isDisabled
      ? 'rgba(0,0,0,0.2)'
      : isLate
        ? 'rgba(212, 175, 55, 0.15)'
        : isTentative
          ? 'rgba(99, 179, 237, 0.12)'
          : undefined;

    return (
      <Table.Tr key={player.id} bg={rowBg} style={{ opacity: isDisabled ? 0.5 : 1 }}>
        <Table.Td
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 1,
            width: 200,
            minWidth: 200,
            background: isDisabled
              ? 'rgba(0,0,0,0.2)'
              : isLate
                ? 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, rgb(212, 175, 55) 22%)'
                : isTentative
                  ? 'color-mix(in srgb, var(--mantine-color-dark-7) 80%, rgb(99, 179, 237) 20%)'
                  : 'var(--mantine-color-dark-7)',
          }}
        >
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Group gap="xs" wrap="nowrap">
              <img
                src={`/src/character/class/${normalizeClass(player.class)}-icon.svg`}
                alt=""
                style={{ width: 20, height: '100%', borderRadius: '2px' }}
              />
              <Tooltip
                label={isLate && player.lateTime ? `En retard — ${player.lateTime}` : undefined}
                disabled={!(isLate && player.lateTime)}
                withArrow
                withinPortal
              >
                <Text size="sm" fw={600} truncate className={`class-${player.class}`}>
                  {player.name}
                </Text>
              </Tooltip>
            </Group>

            <Group gap={4} wrap="nowrap">
              {isInConcurrentEvent && <SplitBadge />}
              <Badge
                variant="filled"
                size="xs"
                color={ROLE_COLORS[currentDefaultRole]}
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: 0,
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                {currentDefaultRole === ROLES.HEALER ? 'H' : currentDefaultRole[0]}
              </Badge>
              {isEditable && !isDisabled && onAssignAll && (
                <Menu shadow="md" width={170} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="xs">
                      <IconDotsVertical size={12} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Assigner à tous les boss</Menu.Label>
                    {Object.entries(ROLES).map(([key, value]) => (
                      <Menu.Item
                        key={key}
                        color={ROLE_COLORS[value]}
                        onClick={() => onAssignAll(player.id, value)}
                      >
                        {value}
                      </Menu.Item>
                    ))}
                    <Menu.Divider />
                    <Menu.Item
                      color="gray"
                      leftSection={<IconX size={14} />}
                      onClick={() => onAssignAll(player.id, null)}
                    >
                      Retirer de tous les boss
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          </Group>
        </Table.Td>

        <Table.Td
          align="center"
          style={{
            position: 'sticky',
            left: 200,
            zIndex: 1,
            width: 48,
            minWidth: 48,
            background: isDisabled
              ? 'rgba(0,0,0,0.2)'
              : isLate
                ? 'color-mix(in srgb, var(--mantine-color-dark-7) 78%, rgb(212, 175, 55) 22%)'
                : isTentative
                  ? 'color-mix(in srgb, var(--mantine-color-dark-7) 80%, rgb(99, 179, 237) 20%)'
                  : 'var(--mantine-color-dark-7)',
          }}
        >
          <Text size="sm" fw={700} c={killsCount > 0 ? 'brand' : 'dimmed'}>
            {killsCount}
          </Text>
        </Table.Td>

        {bosses.map((boss) => {
          const assignment = assignmentMap[`${player.id}-${boss.id}`];
          const role = (assignment?.role as RoleType) || currentDefaultRole;

          return (
            <Table.Td key={boss.id} align="center">
              <Group gap={0} justify="center" wrap="nowrap">
                <Badge
                  variant={assignment ? 'filled' : 'outline'}
                  color={assignment ? ROLE_COLORS[role] : 'gray.6'}
                  size="sm"
                  onClick={() =>
                    isEditable &&
                    !isDisabled &&
                    onToggle(player.id, boss.id, assignment ? null : currentDefaultRole)
                  }
                  style={{
                    cursor: isEditable && !isDisabled ? 'pointer' : 'default',
                    borderRight: 'none',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    minWidth: 55,
                    opacity: isDisabled ? 0.3 : 1,
                    height: 22,
                    fontSize: '10px',
                    backgroundColor: !assignment ? 'rgba(255,255,255,0.05)' : undefined,
                  }}
                >
                  {assignment ? role : 'OUT'}
                </Badge>

                {isEditable && !isDisabled && (
                  <Menu shadow="md" width={150} position="bottom">
                    <Menu.Target>
                      <ActionIcon
                        variant={assignment ? 'filled' : 'outline'}
                        color={assignment ? ROLE_COLORS[role] : 'gray.6'}
                        size="xs"
                        style={{
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          height: 22,
                          width: 18,
                          backgroundColor: !assignment ? 'rgba(255,255,255,0.05)' : undefined,
                        }}
                      >
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>Changer le rôle : {boss.name}</Menu.Label>
                      {Object.entries(ROLES).map(([key, value]) => (
                        <Menu.Item
                          key={key}
                          color={ROLE_COLORS[value]}
                          onClick={() => onToggle(player.id, boss.id, value)}
                        >
                          {value}
                        </Menu.Item>
                      ))}
                      <Menu.Divider />
                      <Menu.Item
                        color="gray"
                        leftSection={<IconX size={14} />}
                        onClick={() => onToggle(player.id, boss.id, null)}
                      >
                        {t('guests.unassign')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            </Table.Td>
          );
        })}
      </Table.Tr>
    );
  };

  const guestAssignmentMap = useMemo(() => {
    const map: Record<string, RaidGuestAssignment> = {};
    guestAssignments.forEach((a) => {
      map[`${a.guestId}-${a.bossId}`] = a;
    });
    return map;
  }, [guestAssignments]);

  const renderGuestRow = (guest: RaidGuest) => {
    const defaultRole = guest.role as RoleType;

    return (
      <Table.Tr key={`guest-${guest.id}`}>
        <Table.Td>
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Group gap="xs" wrap="nowrap">
              {guest.class ? (
                <img
                  src={`/src/character/class/${normalizeClass(guest.class)}-icon.svg`}
                  alt={guest.class}
                  style={{ width: 20, height: 20, borderRadius: '2px' }}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  👤
                </Text>
              )}
              <Text size="sm" fw={600} c="teal.4" truncate>
                {guest.name}
              </Text>
            </Group>
            <Badge
              variant="light"
              size="xs"
              color="teal"
              style={{
                minWidth: 20,
                height: 20,
                padding: 0,
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 800,
              }}
            >
              {defaultRole === ROLES.HEALER ? 'H' : defaultRole[0]}
            </Badge>
          </Group>
        </Table.Td>

        <Table.Td
          align="center"
          style={{
            position: 'sticky',
            left: 200,
            zIndex: 1,
            width: 48,
            minWidth: 48,
            background: 'var(--mantine-color-dark-7)',
          }}
        >
          <Text
            size="sm"
            fw={700}
            c={
              guestAssignments.filter((a) => a.guestId === guest.id).length > 0 ? 'teal' : 'dimmed'
            }
          >
            {guestAssignments.filter((a) => a.guestId === guest.id).length}
          </Text>
        </Table.Td>

        {bosses.map((boss) => {
          const assignment = guestAssignmentMap[`${guest.id}-${boss.id}`];
          const role = (assignment?.role as RoleType) || defaultRole;

          return (
            <Table.Td key={boss.id} align="center">
              <Group gap={0} justify="center" wrap="nowrap">
                <Badge
                  variant={assignment ? 'filled' : 'outline'}
                  color={assignment ? ROLE_COLORS[role] : 'gray.6'}
                  size="sm"
                  onClick={() =>
                    isEditable &&
                    onGuestToggle &&
                    onGuestToggle(guest.id, boss.id, assignment ? null : defaultRole)
                  }
                  style={{
                    cursor: isEditable && onGuestToggle ? 'pointer' : 'default',
                    borderRight: 'none',
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    minWidth: 55,
                    height: 22,
                    fontSize: '10px',
                    backgroundColor: !assignment ? 'rgba(255,255,255,0.05)' : undefined,
                  }}
                >
                  {assignment ? role : 'OUT'}
                </Badge>

                {isEditable && onGuestToggle && (
                  <Menu shadow="md" width={150} position="bottom">
                    <Menu.Target>
                      <ActionIcon
                        variant={assignment ? 'filled' : 'outline'}
                        color={assignment ? ROLE_COLORS[role] : 'gray.6'}
                        size="xs"
                        style={{
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          height: 22,
                          width: 18,
                          backgroundColor: !assignment ? 'rgba(255,255,255,0.05)' : undefined,
                        }}
                      >
                        <IconDotsVertical size={12} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>{t('guests.role', { name: boss.name })}</Menu.Label>
                      {Object.entries(ROLES).map(([key, value]) => (
                        <Menu.Item
                          key={key}
                          color={ROLE_COLORS[value]}
                          onClick={() => onGuestToggle(guest.id, boss.id, value)}
                        >
                          {value}
                        </Menu.Item>
                      ))}
                      <Menu.Divider />
                      <Menu.Item
                        color="gray"
                        leftSection={<IconX size={14} />}
                        onClick={() => onGuestToggle(guest.id, boss.id, null)}
                      >
                        {t('guests.unassign')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                )}
              </Group>
            </Table.Td>
          );
        })}
      </Table.Tr>
    );
  };

  const groupsOrder = ['TANKS', 'HEALS', 'RANGE DPS', 'MELEE DPS', 'ABSENT'];

  return (
    <Paper withBorder bg="dark.7" p={0} radius="md" style={{ overflow: 'hidden' }}>
      <ScrollArea h="calc(100vh - 160px)" offsetScrollbars style={{ overflowX: 'auto' }}>
        <Table withColumnBorders withRowBorders highlightOnHover striped stickyHeader>
          <Table.Thead bg="dark.8">
            <Table.Tr>
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 2,
                  width: 200,
                  minWidth: 200,
                  background: 'var(--mantine-color-dark-8)',
                }}
              />
              <Table.Th
                style={{
                  position: 'sticky',
                  left: 200,
                  zIndex: 2,
                  width: 48,
                  minWidth: 48,
                  background: 'var(--mantine-color-dark-8)',
                  textAlign: 'center',
                }}
              />
              {bosses.map((boss, idx) => {
                const bossAssignments = assignments.filter((a) => a.bossId === boss.id);
                const bossGuestCount = guestAssignments.filter((a) => a.bossId === boss.id).length;
                const totalCount = bossAssignments.length + bossGuestCount;

                return (
                  <Table.Th key={boss.id} style={{ minWidth: 100 }} p="xs">
                    <Group gap={0} wrap="nowrap" justify="space-between" align="center">
                      {onMoveBoss ? (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          disabled={idx === 0}
                          onClick={() => onMoveBoss(boss.id, 'left')}
                        >
                          <IconChevronLeft size={12} />
                        </ActionIcon>
                      ) : (
                        <Box w={22} />
                      )}

                      <Stack gap={2} align="center" style={{ flex: 1 }}>
                        <Tooltip label={boss.name} withArrow withinPortal>
                          <img
                            src={boss.icon}
                            alt={boss.name}
                            style={{ width: 36, borderRadius: '4px', cursor: 'help' }}
                          />
                        </Tooltip>
                        <Text size="xs" fw={800} c="white" style={{ lineHeight: 1 }}>
                          {totalCount}/{maxPlayers}
                        </Text>
                      </Stack>

                      {onMoveBoss ? (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="gray"
                          disabled={idx === bosses.length - 1}
                          onClick={() => onMoveBoss(boss.id, 'right')}
                        >
                          <IconChevronRight size={12} />
                        </ActionIcon>
                      ) : (
                        <Box w={22} />
                      )}
                    </Group>
                  </Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {renderBuffsRow()}
            {guests.length > 0 && (
              <React.Fragment>
                <Table.Tr
                  bg="dark.6"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleGroup('INVITÉS')}
                >
                  <Table.Td p="xs">
                    <Group gap="xs">
                      {collapsedGroups['INVITÉS'] ? (
                        <IconChevronDown size={14} />
                      ) : (
                        <IconChevronUp size={14} />
                      )}
                      <Text size="xs" fw={700} tt="uppercase" c="teal.4">
                        {t('guests.title', { count: guests.length })}
                      </Text>
                    </Group>
                  </Table.Td>
                  {bosses.map((boss) => {
                    const count = guestAssignments.filter((a) => a.bossId === boss.id).length;
                    return (
                      <Table.Td key={boss.id} align="center">
                        {count > 0 && (
                          <Group gap={4} justify="center">
                            <Text size="xs" fw={800} c="teal.4">
                              👤 {count}
                            </Text>
                          </Group>
                        )}
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
                {!collapsedGroups['INVITÉS'] && guests.map(renderGuestRow)}
              </React.Fragment>
            )}
            {groupsOrder.map((group) => {
              const players = groupedPlayers[group];
              if (players.length === 0) return null;
              const isCollapsed = collapsedGroups[group];

              const groupRole =
                group === 'TANKS'
                  ? ROLES.TANK
                  : group === 'HEALS'
                    ? ROLES.HEALER
                    : group === 'RANGE DPS'
                      ? ROLES.RANGED
                      : group === 'MELEE DPS'
                        ? ROLES.MELEE
                        : null;

              const groupRoleIcon =
                group === 'TANKS'
                  ? '/src/character/role/tank.webp'
                  : group === 'HEALS'
                    ? '/src/character/role/healer.webp'
                    : group === 'RANGE DPS'
                      ? '/src/character/role/ranged.webp'
                      : group === 'MELEE DPS'
                        ? '/src/character/role/melee.webp'
                        : null;

              return (
                <React.Fragment key={group}>
                  <Table.Tr
                    bg="dark.6"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleGroup(group)}
                  >
                    <Table.Td
                      p="xs"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        width: 200,
                        minWidth: 200,
                        background: 'var(--mantine-color-dark-6)',
                      }}
                    >
                      <Group gap="xs">
                        {isCollapsed ? <IconChevronDown size={14} /> : <IconChevronUp size={14} />}
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                          {group} ({players.length})
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td
                      style={{
                        position: 'sticky',
                        left: 200,
                        zIndex: 1,
                        width: 48,
                        minWidth: 48,
                        background: 'var(--mantine-color-dark-6)',
                      }}
                    />

                    {bosses.map((boss) => {
                      const count = assignments.filter(
                        (a) => a.bossId === boss.id && groupRole && a.role === groupRole,
                      ).length;

                      return (
                        <Table.Td key={boss.id} align="center">
                          {groupRoleIcon && count > 0 && (
                            <Group gap={4} justify="center">
                              <img src={groupRoleIcon} alt="" style={{ width: 14, height: 14 }} />
                              <Text size="xs" fw={800} c="white">
                                {count}
                              </Text>
                            </Group>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                  {!isCollapsed && players.map(renderPlayerRow)}
                </React.Fragment>
              );
            })}

            {splitPlayers.length > 0 && (
              <React.Fragment>
                <Table.Tr
                  bg="rgba(255, 140, 0, 0.08)"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleGroup('SPLIT')}
                >
                  <Table.Td p="xs">
                    <Group gap="xs">
                      {collapsedGroups['SPLIT'] ? (
                        <IconChevronDown size={14} />
                      ) : (
                        <IconChevronUp size={14} />
                      )}
                      <Text size="xs" fw={700} tt="uppercase" c="orange.4">
                        ⚔ Split ({splitPlayers.length})
                      </Text>
                    </Group>
                  </Table.Td>
                  {bosses.map((boss) => (
                    <Table.Td key={boss.id} />
                  ))}
                </Table.Tr>
                {!collapsedGroups['SPLIT'] && splitPlayers.map(renderPlayerRow)}
              </React.Fragment>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
};
