import {
  ActionIcon,
  Box,
  Group,
  Loader,
  Menu,
  Paper,
  rem,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCopy,
  IconDotsVertical,
  IconFiles,
  IconTrash,
} from '@tabler/icons-react';
import {
  useAssignToRoster,
  useClearBossRoster,
  useCopyRoster,
  useEventRoster,
  useRemoveFromRoster,
} from 'hooks/queries';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PoolCharacter, RosterAssignment } from 'services/roster.service';

import type { TogglePlayer } from '../RoleColumn/RoleColumn';
import RoleColumn from '../RoleColumn/RoleColumn';
import { CopyRosterModal } from './CopyRosterModal';

const ROLES = {
  TANK: 'TANK',
  HEALER: 'HEALER',
  MELEE: 'MELEE',
  RANGED: 'RANGED',
} as const;

type RoleType = (typeof ROLES)[keyof typeof ROLES];

interface BossRosterColumnProps {
  eventId: number;
  realmId: number;
  bossId: number;
  bossName: string;
  bossImage?: string;
  allBosses?: { id: number; name: string }[];
  allPlayers: PoolCharacter[];
  isEditable?: boolean;
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

const BossRosterColumn = ({
  eventId,
  realmId,
  bossId,
  bossName,
  bossImage,
  allBosses,
  allPlayers,
  isEditable = true,
}: BossRosterColumnProps) => {
  const { t } = useTranslation('eventRoster');
  const { data: rosterData, isLoading, isError } = useEventRoster(eventId, realmId, bossId);
  const { mutate: copyRoster, isPending: isCopyPending } = useCopyRoster(eventId, realmId);
  const { mutate: clearBossRoster } = useClearBossRoster(eventId, realmId);
  const assignToRoster = useAssignToRoster();
  const removeFromRoster = useRemoveFromRoster();
  const [copyModalOpened, setCopyModalOpened] = useState(false);

  const allAssigned: RosterAssignment[] = [
    ...(rosterData?.tanks || []),
    ...(rosterData?.healers || []),
    ...(rosterData?.melee || []),
    ...(rosterData?.ranged || []),
  ];

  const assignedCharIds = new Set(allAssigned.map((a) => a.characterId));

  const roleLists: Record<RoleType, TogglePlayer[]> = {
    [ROLES.TANK]: [],
    [ROLES.HEALER]: [],
    [ROLES.MELEE]: [],
    [ROLES.RANGED]: [],
  };

  for (const player of allPlayers) {
    if (player.disabled) continue;

    const isActive = assignedCharIds.has(player.id);

    let role: RoleType;
    if (isActive) {
      const assignment = allAssigned.find((a) => a.characterId === player.id);
      role = (assignment?.role as RoleType) || mapSpecRole(player.specialization?.role);
    } else {
      role = mapSpecRole(player.specialization?.role);
    }

    roleLists[role].push({
      id: player.id,
      name: player.name,
      class: player.class,
      specialization: player.specialization,
      isActive,
      signupStatus: player.signupStatus,
    });
  }

  for (const assignment of allAssigned) {
    const charId = assignment.characterId;
    const alreadyInList = allPlayers.some((p) => p.id === charId && !p.disabled);
    if (!alreadyInList) {
      const role =
        (assignment.role as RoleType) || mapSpecRole(assignment.character?.specialization?.role);
      roleLists[role].push({
        id: charId,
        name: assignment.character?.name || 'Unknown',
        class: assignment.character?.class || '',
        specialization: assignment.character?.specialization,
        isActive: true,
      });
    }
  }

  const totalActive = allAssigned.length;

  const handleToggle = (characterId: number, isCurrentlyActive: boolean) => {
    if (isCurrentlyActive) {
      removeFromRoster.mutate({
        eventId,
        characterId,
        realmId,
        bossId,
      });
    } else {
      const player = allPlayers.find((p) => p.id === characterId);
      const role = mapSpecRole(player?.specialization?.role);
      assignToRoster.mutate({
        eventId,
        realmId,
        payload: {
          characterId,
          role,
          bossId,
        },
      });
    }
  };

  const handleChangeRole = async (characterId: number, newRole: string) => {
    try {
      await removeFromRoster.mutateAsync({
        eventId,
        characterId,
        realmId,
        bossId,
      });
      await assignToRoster.mutateAsync({
        eventId,
        realmId,
        payload: {
          characterId,
          role: newRole as RoleType,
          bossId,
        },
      });
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleCopyRoster = (targetBossIds: number[]) => {
    copyRoster({ sourceBossId: bossId, targetBossIds });
  };

  const handleClearRoster = () => {
    if (
      window.confirm(
        t('confirmClear', {
          defaultValue: 'Are you sure you want to clear the roster for this boss?',
        }),
      )
    ) {
      clearBossRoster(bossId);
    }
  };

  const handleCopyToAll = () => {
    if (!allBosses) return;
    const targetBossIds = allBosses.filter((b) => b.id !== bossId).map((b) => b.id);
    if (targetBossIds.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to copy this roster to ALL other bosses (${targetBossIds.length})? This will merge assignments.`,
      )
    ) {
      copyRoster({ sourceBossId: bossId, targetBossIds });
    }
  };

  return (
    <Paper
      withBorder
      p="xs"
      bg="dark.9"
      miw={300}
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      <Box>
        <Group justify="space-between">
          <Group gap={8} wrap="nowrap" style={{ flex: 1, overflow: 'hidden' }}>
            {bossImage && (
              <img
                src={bossImage}
                alt={bossName}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '4px',
                  objectFit: 'cover',
                }}
              />
            )}
            <Text fw={700} truncate title={bossName}>
              {bossName}
            </Text>
          </Group>
          <Group gap={4}>
            {isError && (
              <Tooltip label="Error loading roster">
                <ActionIcon color="red" variant="subtle" size="sm">
                  <IconAlertTriangle size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {isEditable && (
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray">
                    <IconDotsVertical style={{ width: '70%', height: '70%' }} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>Roster Actions</Menu.Label>
                  <Menu.Item
                    leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
                    onClick={() => setCopyModalOpened(true)}
                  >
                    Copy to...
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconFiles style={{ width: rem(14), height: rem(14) }} />}
                    onClick={handleCopyToAll}
                  >
                    Copy to All Bosses
                  </Menu.Item>

                  <Menu.Divider />

                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash style={{ width: rem(14), height: rem(14) }} />}
                    onClick={handleClearRoster}
                  >
                    Clear Roster
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
        <Text size="xs" c="dimmed" mb="xs">
          {totalActive} {t('assigned', { defaultValue: 'assigned' })}
        </Text>
      </Box>

      <Box p="xs" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
        <Group gap={6} wrap="wrap" justify="center">
          {(() => {
            const presentClasses = new Set(
              allAssigned.map((s) => (s.character?.class || '').toLowerCase().replace(/\s+/g, '_')),
            );

            const RAID_BUFFS = [
              {
                id: 'druid',
                label: t('raidBuffs.druid'),
                icon: '/src/character/class/druid-icon.svg',
              },
              {
                id: 'mage',
                label: t('raidBuffs.mage'),
                icon: '/src/character/class/mage-icon.svg',
              },
              {
                id: 'warrior',
                label: t('raidBuffs.warrior'),
                icon: '/src/character/class/warrior-icon.svg',
              },
              {
                id: 'paladin',
                label: t('raidBuffs.paladin'),
                icon: '/src/character/class/paladin-icon.svg',
              },
              {
                id: 'priest',
                label: t('raidBuffs.priest'),
                icon: '/src/character/class/priest-icon.svg',
              },
              {
                id: 'hunter',
                label: t('raidBuffs.hunter'),
                icon: '/src/character/class/hunter-icon.svg',
              },
              {
                id: 'evoker',
                label: t('raidBuffs.evoker'),
                icon: '/src/character/class/evoker-icon.svg',
              },
              {
                id: 'shaman',
                label: t('raidBuffs.shaman'),
                icon: '/src/character/class/shaman-icon.svg',
              },
              {
                id: 'monk',
                label: t('raidBuffs.monk'),
                icon: '/src/character/class/monk-icon.svg',
              },
              {
                id: 'demon_hunter',
                label: t('raidBuffs.demon_hunter'),
                icon: '/src/character/class/demon_hunter-icon.svg',
              },
            ];

            return RAID_BUFFS.map((buff) => {
              const isActive = presentClasses.has(buff.id);
              return (
                <Tooltip key={buff.id} label={buff.label} withArrow>
                  <Box
                    style={{
                      width: 16,
                      height: 16,
                      opacity: isActive ? 1 : 0.2,
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
            });
          })()}
        </Group>
      </Box>

      {isLoading ? (
        <Stack align="center" justify="center" h={200}>
          <Loader size="sm" />
        </Stack>
      ) : (
        <Stack gap="md" style={{ flex: 1 }}>
          <RoleColumn
            role={ROLES.TANK}
            items={roleLists[ROLES.TANK]}
            title="TANKS"
            isEditable={isEditable}
            onToggle={handleToggle}
            onChangeRole={handleChangeRole}
          />
          <RoleColumn
            role={ROLES.HEALER}
            items={roleLists[ROLES.HEALER]}
            title="HEALS"
            isEditable={isEditable}
            onToggle={handleToggle}
            onChangeRole={handleChangeRole}
          />
          <RoleColumn
            role={ROLES.MELEE}
            items={roleLists[ROLES.MELEE]}
            title="MELEE"
            isEditable={isEditable}
            onToggle={handleToggle}
            onChangeRole={handleChangeRole}
          />
          <RoleColumn
            role={ROLES.RANGED}
            items={roleLists[ROLES.RANGED]}
            title="RANGED"
            isEditable={isEditable}
            onToggle={handleToggle}
            onChangeRole={handleChangeRole}
          />
        </Stack>
      )}

      <CopyRosterModal
        opened={copyModalOpened}
        onClose={() => setCopyModalOpened(false)}
        sourceBossId={bossId}
        sourceBossName={bossName}
        allBosses={allBosses ?? []}
        onCopy={handleCopyRoster}
        isPending={isCopyPending}
      />
    </Paper>
  );
};

export default BossRosterColumn;
