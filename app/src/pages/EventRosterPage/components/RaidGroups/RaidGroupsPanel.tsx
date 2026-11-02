import { Alert, Badge, Group, Paper, Select, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { classColors } from 'components/design-system/tokens';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RaidGuest, RaidGuestAssignment } from 'services/event.service';
import type { RosterAssignment } from 'services/roster.service';

import {
  bossesOverCapacity,
  bossMembers,
  countByRole,
  RAID_ROLES,
  type RaidMember,
  raidCapacity,
  splitIntoGroups,
} from './raidGroups';

interface RaidGroupsPanelProps {
  /** Taille fixe du raid de l'événement (10, 20 ou 40). */
  raidSize: number;
  bosses: ReadonlyArray<{ id: number; name: string }>;
  assignments: readonly RosterAssignment[];
  guests: readonly RaidGuest[];
  guestAssignments: readonly RaidGuestAssignment[];
}

const getClassColor = (className: string | null) => {
  if (!className) return undefined;
  const key = className.toLowerCase().replace(/\s+/g, '_');
  return classColors[key as keyof typeof classColors] || undefined;
};

/**
 * Composition d'un raid à taille fixe (SIMS-028) : groupes de 5, compteur
 * « placés / taille » et par rôle, alerte (sans blocage) au-delà de la taille.
 */
export function RaidGroupsPanel({
  raidSize,
  bosses,
  assignments,
  guests,
  guestAssignments,
}: RaidGroupsPanelProps) {
  const { t } = useTranslation('eventRoster');
  const [selectedBossId, setSelectedBossId] = useState<number | null>(null);

  const membersByBoss = useMemo(
    () =>
      new Map<number, RaidMember[]>(
        bosses.map((boss) => [
          boss.id,
          bossMembers(boss.id, assignments, guests, guestAssignments),
        ]),
      ),
    [bosses, assignments, guests, guestAssignments],
  );

  const bossId = bosses.some((b) => b.id === selectedBossId) ? selectedBossId : bosses[0]?.id;
  if (bossId == null) return null;

  const members = membersByBoss.get(bossId) ?? [];
  const capacity = raidCapacity(members.length, raidSize);
  const roleCounts = countByRole(members);
  const groups = splitIntoGroups(members, raidSize);
  const overBosses = bossesOverCapacity(bosses, membersByBoss, raidSize);

  return (
    <Paper withBorder p="md" radius="md" data-testid="raid-groups">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm">
            <Title order={5}>{t('raidGroups.title', { size: raidSize })}</Title>
            <Badge
              color={capacity.isOver ? 'red' : capacity.count === raidSize ? 'green' : 'gray'}
              variant="light"
              data-testid="raid-groups-count"
            >
              {t('raidGroups.count', { count: capacity.count, size: raidSize })}
            </Badge>
            {RAID_ROLES.map((role) => (
              <Badge key={role} variant="outline" color="gray" data-testid={`raid-role-${role}`}>
                {t(`raidGroups.roles.${role}`)} : {roleCounts[role]}
              </Badge>
            ))}
          </Group>
          {bosses.length > 1 && (
            <Select
              size="xs"
              aria-label={t('raidGroups.boss')}
              data={bosses.map((b) => ({ value: String(b.id), label: b.name }))}
              value={String(bossId)}
              onChange={(value) => value && setSelectedBossId(Number(value))}
              allowDeselect={false}
            />
          )}
        </Group>

        {overBosses.length > 0 && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={18} />}
            title={t('raidGroups.overTitle', { size: raidSize })}
            data-testid="raid-groups-over"
          >
            {overBosses
              .map(({ boss, capacity: c }) =>
                t('raidGroups.overBoss', { boss: boss.name, count: c.count, size: raidSize }),
              )
              .join(' · ')}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          {groups.map((group) => (
            <Paper
              key={group.number}
              withBorder
              p="xs"
              radius="sm"
              data-testid={`raid-group-${group.number}`}
            >
              <Text size="xs" fw={700} c="dimmed" mb={4}>
                {t('raidGroups.group', { number: group.number })}
              </Text>
              <Stack gap={2}>
                {group.slots.map((slot, index) =>
                  slot.member ? (
                    <Group key={slot.member.key} gap={6} wrap="nowrap">
                      <Text
                        size="sm"
                        fw={600}
                        c={getClassColor(slot.member.className)}
                        td={slot.overCapacity ? 'line-through' : undefined}
                        truncate
                      >
                        {slot.member.name}
                      </Text>
                      {slot.member.isGuest && (
                        <Badge size="xs" variant="light" color="gray">
                          {t('raidGroups.guest')}
                        </Badge>
                      )}
                      {slot.overCapacity && (
                        <Badge size="xs" variant="light" color="red">
                          {t('raidGroups.over')}
                        </Badge>
                      )}
                    </Group>
                  ) : (
                    <Text key={`empty-${index}`} size="sm" c="dimmed">
                      {t('raidGroups.empty')}
                    </Text>
                  ),
                )}
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}
