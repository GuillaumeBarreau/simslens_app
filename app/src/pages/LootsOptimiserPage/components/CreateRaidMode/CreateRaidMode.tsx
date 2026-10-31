import { Alert, Box, Flex, Loader, ScrollArea, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { handleCreateInstanceFromRaid } from '../../utils';
import { RaidCard } from '../RaidCard';
import { Raid } from '../types';

interface CreateRaidModeProps {
  raids: any;
  raidsLoading: boolean;
  raidsError: boolean;
  sessionName: string;
  onSessionNameChange: (value: string) => void;
  onCreateNewSession: () => Promise<void>;
  isCreating: boolean;
  createError: string | null;
  onSelect: (raid: Raid) => void;
}

export function CreateRaidMode({
  raids,
  raidsLoading,
  raidsError,
  onSelect,
}: CreateRaidModeProps): React.ReactElement {
  const queryClient = useQueryClient();

  const getDifficultyRank = (d?: number) => {
    if (!d) return 99;
    if (d === 1) return 0;
    if (d === 2) return 1;
    if (d === 3) return 2;
    return 50;
  };

  return (
    <Stack gap="md">
      <Box>
        <Text fw={600} size="sm" mb="md">
          Créer à partir d'un raid
        </Text>

        {raidsLoading ? (
          <Flex justify="center" align="center" py="xl">
            <Loader size="sm" />
          </Flex>
        ) : raidsError ? (
          <Alert icon={<IconAlertCircle />} color="red" title="Erreur">
            Erreur lors du chargement des raids
          </Alert>
        ) : !raids || (raids as Raid[]).length === 0 ? (
          <Alert icon={<IconAlertCircle />} color="blue" title="Aucun raid">
            Aucun raid disponible
          </Alert>
        ) : (
          <ScrollArea>
            <Stack gap="xs" pb="md">
              {([...raids] as Raid[])
                .slice()
                .sort(
                  (a, b) =>
                    getDifficultyRank(a.raidDifficultyId) - getDifficultyRank(b.raidDifficultyId),
                )
                .map((raid) => {
                  return (
                    <RaidCard
                      key={raid.id}
                      raid={raid}
                      onCreateInstance={() =>
                        handleCreateInstanceFromRaid(raid, queryClient, onSelect)
                      }
                    />
                  );
                })}
            </Stack>
          </ScrollArea>
        )}
      </Box>
    </Stack>
  );
}
