import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveBackgroundInstancePath } from 'utils/resolveBackgroundInstancePath';

import { Raid } from '../types';

interface RaidCardProps {
  raid: Raid;
  onCreateInstance: () => Promise<void>;
}

export function RaidCard({ raid, onCreateInstance }: RaidCardProps): React.ReactElement {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateClick = useCallback(async () => {
    setIsLoading(true);
    try {
      await onCreateInstance();
    } finally {
      setIsLoading(false);
    }
  }, [onCreateInstance]);

  const path = raid.name.replace(' ', '_');

  const difficultyOverlayColor = (() => {
    switch (raid.difficulty) {
      case 1:
        return 'rgba(0, 0, 0, 0)';
      case 2:
        return 'rgba(0, 0, 0, 0.21)';
      case 3:
        return 'rgba(0, 0, 0, 0.4)';
      default:
        return 'rgba(0,0,0,0)';
    }
  })();

  return (
    <Paper
      p="sm"
      bg="transparent"
      bdrs="md"
      h={120}
      mt="sm"
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <img
        src={resolveBackgroundInstancePath(path, raid.image_background)}
        alt={raid.name}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          background:
            'linear-gradient(90deg, rgba(24, 10, 10, 0.12) 0%,rgba(24, 10, 10, 0.28) 40%, rgba(0, 0, 0, 0.9) 100%)',
          zIndex: 3,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: difficultyOverlayColor,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      <Group justify="space-between" align="center" style={{ position: 'relative', zIndex: 4 }}>
        <Group gap="sm" style={{ flex: 1 }}>
          <Stack gap={2}>
            <Text fw={600} size="md">
              {raid.name}
            </Text>
            {raid.difficulty && (
              <Text size="md" c="dimmed">
                {t(
                  `common:difficulties.${String(raid.difficulty).toLowerCase()}`,
                  String(raid.difficulty),
                )}
              </Text>
            )}
          </Stack>
        </Group>

        <Button size="xs" onClick={handleCreateClick} loading={isLoading} bg="brand.5">
          Créer la session
        </Button>
      </Group>
    </Paper>
  );
}
