import { Flex, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { BossImageCard } from 'components/domain/tracking/BossImageCard/BossImageCard';
import { useInstanceBosses } from 'hooks/queries';
import React, { useCallback, useMemo } from 'react';

import { useBossesContext } from '../../contexts/BossesContext';
import { CardImage } from '../CardImage';
import { Instance, Raid } from '../types';

interface InstanceCardProps {
  instance: Instance;
  onSelect: (raid: Raid) => void;
}

export function InstanceCard({ instance, onSelect }: InstanceCardProps): React.ReactElement {
  const allBosses = useBossesContext();
  const { data: bossList = [], isLoading } = useInstanceBosses(instance.id, instance.realmId);

  const bossStatuses = useMemo(() => {
    const statusMap: Record<number, { killed: boolean; killedAt?: string }> = {};
    if (Array.isArray(bossList)) {
      bossList.forEach((boss) => {
        statusMap[boss.bossId] = {
          killed: boss.killed === 1,
          killedAt: boss.killedAt,
        };
      });
    }
    return statusMap;
  }, [bossList]);

  const handleClick = useCallback(() => {
    onSelect({
      id: instance.id,
      name: instance.name,
      difficulty: instance.raidDifficultyId,
    });
  }, [instance, onSelect]);

  return (
    <Paper
      p="sm"
      bg="var(--mantine-color-app-7)"
      bd="2px solid var(--mantine-color-app-6)"
      withBorder
      onClick={handleClick}
      style={{ cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap="sm" style={{ flex: 1 }}>
          <Group gap="sm" align="flex-start">
            <CardImage
              src={instance.image_button_small || instance.rd_image_button || instance.image_button}
              alt={instance.name}
            />

            <Group justify="space-between" style={{ flex: 1 }} align="flex-start">
              <Text fw={600} size="sm">
                {instance.name}
              </Text>
              <Text size="xs" c="dimmed">
                {new Date(instance.date).toLocaleString('fr-FR')}
              </Text>
            </Group>
          </Group>

          {isLoading ? (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                Chargement des bosses...
              </Text>
            </Group>
          ) : allBosses.length > 0 ? (
            <Flex justify="space-around">
              {allBosses.map((boss, idx: number) => {
                const status = bossStatuses[boss.id];
                return (
                  <BossImageCard
                    variant="div"
                    key={boss.id || idx}
                    boss={boss}
                    idx={idx}
                    size="sm"
                    isCompleted={status?.killed || false}
                    completedAt={status?.killedAt}
                    onSelect={() => {}}
                  />
                );
              })}
            </Flex>
          ) : null}
        </Stack>
      </Group>
    </Paper>
  );
}
